import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerNotificationsPopover() {
  const { user } = useStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from("customer_notifications")
        .select("*")
        .eq("user_id", authUser.user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error("Popover notifications load error:", err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [user, loadNotifications]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("customer-popover-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_notifications" },
        () => loadNotifications(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-lg h-8 w-8 hover:bg-slate-100 transition-colors"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell className="h-4 w-4 text-slate-600" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-88 p-0 rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-extrabold text-xs text-slate-900">Notifications</h4>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-primary text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">{unreadCount} unread</span>
        </div>

        {notifications.length === 0 ? (
          <div className="p-7 text-center space-y-1.5">
            <Bell className="mx-auto h-7 w-7 text-slate-300 mb-1.5" />
            <p className="text-xs font-bold text-slate-900">You're all caught up</p>
            <p className="text-[11px] text-slate-400">No new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <Link
                key={n.id}
                to="/account/notifications"
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 hover:bg-slate-50 transition-colors ${
                  !n.is_read ? "bg-rose-50/20" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-xs leading-snug truncate ${!n.is_read ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}
                  >
                    {typeof n.title === "string" ? n.title : String(n.title || "Notification")}
                  </p>
                  {!n.is_read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
                  {typeof n.message === "string" ? n.message : String(n.message || "")}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs font-bold text-primary hover:text-primary hover:bg-primary/5 rounded-xl h-8 gap-1"
          >
            <Link to="/account/notifications" onClick={() => setOpen(false)}>
              View All Notifications <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
