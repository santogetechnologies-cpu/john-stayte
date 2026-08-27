import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Loader2,
  MessageSquare,
  ShoppingBag,
  Truck,
  CreditCard,
  User,
  Package,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface CustomerNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */

/** Map notification title → icon + colour */
function getNotificationMeta(title: string): {
  Icon: React.ElementType;
  colour: string;
  bg: string;
} {
  const t = title.toLowerCase();
  if (t.includes("support") || t.includes("help") || t.includes("enquir"))
    return { Icon: MessageSquare, colour: "text-red-500", bg: "bg-red-50" };
  if (t.includes("deliver") || t.includes("dispatch") || t.includes("shipment") || t.includes("transit"))
    return { Icon: Truck, colour: "text-blue-500", bg: "bg-blue-50" };
  if (t.includes("order") && (t.includes("confirm") || t.includes("placed")))
    return { Icon: ShoppingBag, colour: "text-emerald-600", bg: "bg-emerald-50" };
  if (t.includes("order") || t.includes("status") || t.includes("package"))
    return { Icon: Package, colour: "text-orange-500", bg: "bg-orange-50" };
  if (t.includes("payment") || t.includes("invoice") || t.includes("receipt"))
    return { Icon: CreditCard, colour: "text-purple-500", bg: "bg-purple-50" };
  if (t.includes("account") || t.includes("profile") || t.includes("password"))
    return { Icon: User, colour: "text-slate-500", bg: "bg-slate-100" };
  return { Icon: Bell, colour: "text-primary", bg: "bg-primary/10" };
}

/** Relative timestamp */
function relativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60) return "Just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} min ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h !== 1 ? "s" : ""} ago`;
  }
  if (diff < 172800) return "Yesterday";

  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Group notifications into TODAY / YESTERDAY / EARLIER */
function groupNotifications(notifications: CustomerNotification[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;

  const today: CustomerNotification[] = [];
  const yesterday: CustomerNotification[] = [];
  const earlier: CustomerNotification[] = [];

  for (const n of notifications) {
    const t = new Date(n.created_at).getTime();
    if (t >= startOfToday) today.push(n);
    else if (t >= startOfYesterday) yesterday.push(n);
    else earlier.push(n);
  }

  return { today, yesterday, earlier };
}

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

interface NotificationRowProps {
  n: CustomerNotification;
  onMarkRead: (id: string) => void;
  onNavigate: (n: CustomerNotification) => void;
}

function NotificationRow({ n, onMarkRead, onNavigate }: NotificationRowProps) {
  const { Icon, colour, bg } = getNotificationMeta(n.title);
  const isUnread = !n.is_read;

  const handleClick = () => {
    if (isUnread) onMarkRead(n.id);
    onNavigate(n);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={`
        group relative flex items-start gap-3.5 px-4 py-3.5 rounded-2xl border cursor-pointer
        transition-all duration-150 select-none outline-none
        focus-visible:ring-2 focus-visible:ring-primary/40
        ${
          isUnread
            ? "bg-red-50/60 border-red-100 hover:bg-red-50 hover:border-red-200"
            : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200"
        }
      `}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 shrink-0 h-8 w-8 rounded-xl flex items-center justify-center ${bg}`}
      >
        <Icon className={`h-4 w-4 ${colour}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug ${
              isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
            }`}
          >
            {n.title}
          </p>
          {/* Timestamp + unread dot */}
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <span className="text-[10px] text-slate-400 whitespace-nowrap">
              {relativeTime(n.created_at)}
            </span>
            {isUnread && (
              <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
            )}
          </div>
        </div>

        <p className="mt-0.5 text-xs text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main View
───────────────────────────────────────── */

export function CustomerNotificationsView() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  /* ── Data loading ── */
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      const { data, error } = await supabase
        .from("customer_notifications")
        .select("*")
        .eq("user_id", authUser.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications((data as CustomerNotification[]) || []);
    } catch (err: unknown) {
      console.error("Notifications load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [user, loadNotifications]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel("customer-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customer_notifications" },
        () => loadNotifications()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  /* ── Mark single as read ── */
  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from("customer_notifications")
        .update({ is_read: true })
        .eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err: unknown) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  /* ── Mark all as read ── */
  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      await supabase
        .from("customer_notifications")
        .update({ is_read: true })
        .eq("user_id", authUser.user.id)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (err: unknown) {
      toast.error("Failed to update notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  /* ── Navigate on click ── */
  const handleNotificationNavigate = (n: CustomerNotification) => {
    if (n.link) {
      navigate({ to: n.link as "/" });
      return;
    }
    const t = n.title.toLowerCase();
    if (t.includes("support") || t.includes("help"))
      navigate({ to: "/account/support" });
    else if (t.includes("order") || t.includes("deliver") || t.includes("payment") || t.includes("dispatch"))
      navigate({ to: "/account/orders" });
  };

  /* ── Derived ── */
  const hasUnread = notifications.some((n) => !n.is_read);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const { today, yesterday, earlier } = groupNotifications(notifications);

  /* ─────────── RENDER ─────────── */
  return (
    <div className="space-y-6 max-w-2xl">
      {/* PAGE HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground leading-tight">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay updated with your orders, deliveries and account activity.
          </p>
        </div>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-full text-xs font-bold gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            onClick={markAllAsRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* BODY */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground">Loading notifications…</p>
        </div>
      ) : notifications.length === 0 ? (
        /* EMPTY STATE */
        <div className="rounded-3xl border border-slate-100 bg-white py-16 px-6 text-center space-y-4 shadow-xs">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Bell className="h-7 w-7 text-slate-400" />
          </div>
          <div className="space-y-1.5 max-w-xs mx-auto">
            <h2 className="font-black text-base text-foreground">You're all caught up</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You don't have any new notifications right now. Order updates and messages will appear here.
            </p>
          </div>
        </div>
      ) : (
        /* NOTIFICATION LIST */
        <div className="space-y-6">
          {today.length > 0 && (
            <div className="space-y-1.5">
              <GroupLabel label="Today" />
              <div className="space-y-1">
                {today.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onMarkRead={markAsRead}
                    onNavigate={handleNotificationNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {yesterday.length > 0 && (
            <div className="space-y-1.5">
              <GroupLabel label="Yesterday" />
              <div className="space-y-1">
                {yesterday.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onMarkRead={markAsRead}
                    onNavigate={handleNotificationNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {earlier.length > 0 && (
            <div className="space-y-1.5">
              <GroupLabel label="Earlier" />
              <div className="space-y-1">
                {earlier.map((n) => (
                  <NotificationRow
                    key={n.id}
                    n={n}
                    onMarkRead={markAsRead}
                    onNavigate={handleNotificationNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer count */}
          <p className="text-center text-[10px] font-medium text-slate-300 pt-2">
            {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            {unreadCount > 0
              ? ` · ${unreadCount} unread`
              : " · all read"}
          </p>
        </div>
      )}
    </div>
  );
}
