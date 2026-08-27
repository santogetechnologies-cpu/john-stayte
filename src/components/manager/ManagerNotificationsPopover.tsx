import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check, Sparkles } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export function ManagerNotificationsPopover() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  const loadNotifications = async () => {
    try {
      const [
        { data: notifsData },
        { data: custNotifsData },
        { data: ticketsData },
      ] = await Promise.all([
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("customer_notifications").select("*").order("created_at", { ascending: false }).limit(10),
        supabase
          .from("support_tickets")
          .select("*")
          .neq("customer_email", "deleted_test_ticket@jss.com")
          .neq("customer_email", "admin@jss.com")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      const ticketNotifs = (ticketsData || []).map((t: any) => ({
        id: `notif_ticket_${t.id}`,
        support_request_id: t.id,
        title: "New customer support request",
        message: `Customer ${t.customer_name || t.customer_email} submitted a new support request: "${t.subject}".`,
        category: "Support",
        read: t.status === "Resolved",
        is_read: t.status === "Resolved",
        created_at: t.created_at,
        link: `/manager/enquiries?ticketId=${t.id}`,
      }));

      const formattedCustNotifs = (custNotifsData || []).map((c: any) => ({
        ...c,
        category: "Support",
        read: Boolean(c.is_read),
        is_read: Boolean(c.is_read),
      }));

      const combined = [...ticketNotifs, ...formattedCustNotifs, ...((notifsData as any[]) || [])];
      
      const seen = new Set();
      const uniqueNotifs = combined.filter((n: any) => {
        const key = n.support_request_id || n.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setNotifications(uniqueNotifs);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    loadNotifications();

    const ticketsChannel = supabase
      .channel("manager_popover_tickets_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => loadNotifications()
      )
      .subscribe();

    const notifsChannel = supabase
      .channel("manager_popover_notifications_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_notifications" },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(notifsChannel);
    };
  }, []);

  const unreadCount = notifications.filter((n: any) => !n.is_read && !n.read).length;

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
    try {
      await supabase
        .from("customer_notifications")
        .update({ is_read: true })
        .eq("is_read", false);
    } catch {
      /* ignore */
    }
  };

  const handleItemClick = async (item: any) => {
    const isUnread = !item.is_read && !item.read;
    if (isUnread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read: true } : n))
      );
      try {
        if (item.id && typeof item.id === "string" && !item.id.startsWith("notif_ticket_")) {
          await supabase
            .from("customer_notifications")
            .update({ is_read: true })
            .eq("id", item.id);
        }
      } catch {
        /* ignore */
      }
    }

    const targetLink = item.link || "/manager/enquiries";
    navigate({ to: targetLink as any });
  };

  return (
    <Popover>
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
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 rounded-2xl border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="rounded-full px-2 text-[10px] bg-primary/10 text-primary font-bold">
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

        <div className="max-h-80 overflow-y-auto divide-y">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/40 mb-1" />
              <p className="text-xs font-medium">All caught up! No unread alerts.</p>
            </div>
          ) : (
            notifications.map((item: any) => {
              const isUnread = !item.is_read && !item.read;
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex gap-3 p-3.5 hover:bg-muted/40 transition-colors text-left cursor-pointer ${
                    isUnread ? "bg-primary/5 font-semibold" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {item.message || item.description}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
