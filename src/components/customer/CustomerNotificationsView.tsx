import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Loader2,
  MessageSquare,
  ShoppingBag,
  Truck,
  User,
  Package,
  CheckCheck,
  CheckCircle2,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export interface CustomerNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

/** Map notification title → icon + colour */
function getNotificationMeta(title: string): {
  Icon: React.ElementType;
  colour: string;
  bg: string;
  category: string;
} {
  const t = title.toLowerCase();
  if (t.includes("support") || t.includes("help") || t.includes("enquir") || t.includes("ticket"))
    return {
      Icon: MessageSquare,
      colour: "text-violet-600",
      bg: "bg-violet-50 border border-violet-100",
      category: "Support",
    };
  if (
    t.includes("deliver") ||
    t.includes("dispatch") ||
    t.includes("shipment") ||
    t.includes("transit") ||
    t.includes("truck")
  )
    return {
      Icon: Truck,
      colour: "text-blue-600",
      bg: "bg-blue-50 border border-blue-100",
      category: "Delivery",
    };
  if (
    t.includes("order") &&
    (t.includes("confirm") || t.includes("placed") || t.includes("received"))
  )
    return {
      Icon: ShoppingBag,
      colour: "text-emerald-600",
      bg: "bg-emerald-50 border border-emerald-100",
      category: "Order Confirmed",
    };
  if (t.includes("order") || t.includes("status") || t.includes("package"))
    return {
      Icon: Package,
      colour: "text-amber-600",
      bg: "bg-amber-50 border border-amber-100",
      category: "Order Update",
    };
  if (
    t.includes("payment") ||
    t.includes("invoice") ||
    t.includes("receipt") ||
    t.includes("billing")
  )
    return {
      Icon: FileText,
      colour: "text-purple-600",
      bg: "bg-purple-50 border border-purple-100",
      category: "Billing",
    };
  if (
    t.includes("account") ||
    t.includes("profile") ||
    t.includes("password") ||
    t.includes("security")
  )
    return {
      Icon: User,
      colour: "text-slate-600",
      bg: "bg-slate-100 border border-slate-200",
      category: "Account",
    };
  return {
    Icon: Bell,
    colour: "text-primary",
    bg: "bg-primary/10 border border-primary/20",
    category: "Notification",
  };
}

/** Relative timestamp formatter */
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

export function CustomerNotificationsView() {
  const { user } = useStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── Load notifications from Supabase ── */
  const loadNotifications = useCallback(async () => {
    setLoading(true);
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

  /* ── Realtime Postgres subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel("customer-notifications-realtime")
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

  /* ── Mark single as read ── */
  const markAsRead = async (id: string) => {
    try {
      await supabase.from("customer_notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
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

      const { error } = await supabase
        .from("customer_notifications")
        .update({ is_read: true })
        .eq("user_id", authUser.user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (err: unknown) {
      toast.error("Failed to update notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  /* ── Delete single notification ── */
  const deleteNotification = async (id: string) => {
    setDeletingId(id);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      const { error } = await supabase
        .from("customer_notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser.user.id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification removed");
    } catch (err: unknown) {
      console.error("Failed to delete notification:", err);
      toast.error("Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Delete all notifications ── */
  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) return;

      const { error } = await supabase
        .from("customer_notifications")
        .delete()
        .eq("user_id", authUser.user.id);

      if (error) throw error;

      setNotifications([]);
      setDeleteAllModalOpen(false);
      toast.success("All notifications deleted");
    } catch (err: unknown) {
      console.error("Failed to delete all notifications:", err);
      toast.error("Failed to delete all notifications");
    } finally {
      setDeletingAll(false);
    }
  };

  /* ── Navigate on click ── */
  const handleNotificationNavigate = (n: CustomerNotification) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    if (n.link) {
      navigate({ to: n.link as "/" });
      return;
    }
    const t = n.title.toLowerCase();
    if (t.includes("support") || t.includes("help") || t.includes("ticket"))
      navigate({ to: "/account/support" });
    else if (t.includes("invoice") || t.includes("receipt") || t.includes("billing"))
      navigate({ to: "/account/invoices" });
    else if (
      t.includes("order") ||
      t.includes("deliver") ||
      t.includes("payment") ||
      t.includes("dispatch")
    )
      navigate({ to: "/account/orders" });
    else if (t.includes("address")) navigate({ to: "/account/addresses" });
  };

  const hasUnread = notifications.some((n) => !n.is_read);
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const { today, yesterday, earlier } = groupNotifications(notifications);

  return (
    <div className="space-y-6 sm:space-y-7 max-w-4xl">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER                                              */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link to="/account" className="hover:text-primary transition-colors">
                Account
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">Notifications</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
                Notifications
              </h1>
              <div className="flex items-center gap-1.5">
                {unreadCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {unreadCount} unread
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    All caught up
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium">
                  ({notifications.length} total)
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Stay updated with your orders, deliveries and account activity with John Stayte
              Services.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {hasUnread && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary h-9 px-3.5 transition-colors cursor-pointer"
                onClick={markAllAsRead}
                disabled={markingAll}
              >
                {markingAll ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5 text-primary" />
                )}
                Mark all as read
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200/80 h-9 px-3.5 transition-colors cursor-pointer"
                onClick={() => setDeleteAllModalOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. NOTIFICATIONS LIST OR EMPTY STATE                         */}
      {/* ============================================================ */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-xs space-y-3">
          <Loader2 className="mx-auto h-7 w-7 text-primary animate-spin" />
          <p className="text-xs text-slate-500 font-bold">Loading your notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        /* COMPACT CENTERED EMPTY STATE */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-xs space-y-3 max-w-md mx-auto">
          <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="h-6 w-6 text-slate-400" />
          </div>

          <div className="space-y-1">
            <h2 className="font-display font-bold text-base text-slate-900">No notifications</h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              You’re all caught up. New updates will appear here.
            </p>
          </div>
        </div>
      ) : (
        /* GROUPED NOTIFICATION CARDS */
        <div className="space-y-5">
          {today.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Today
                </span>
                <div className="flex-1 h-px bg-slate-200/70" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {today.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    isDeleting={deletingId === n.id}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    onNavigate={handleNotificationNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {yesterday.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Yesterday
                </span>
                <div className="flex-1 h-px bg-slate-200/70" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {yesterday.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    isDeleting={deletingId === n.id}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    onNavigate={handleNotificationNavigate}
                  />
                ))}
              </div>
            </div>
          )}

          {earlier.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Earlier
                </span>
                <div className="flex-1 h-px bg-slate-200/70" />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
                {earlier.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    isDeleting={deletingId === n.id}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    onNavigate={handleNotificationNavigate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. DELETE ALL CONFIRMATION DIALOG                            */}
      {/* ============================================================ */}
      <Dialog open={deleteAllModalOpen} onOpenChange={setDeleteAllModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-slate-200 shadow-xl">
          <DialogHeader className="space-y-2.5">
            <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900">
              Delete all notifications?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium leading-relaxed">
              This will permanently remove all notifications from your account. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deletingAll}
              onClick={() => setDeleteAllModalOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 h-9 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deletingAll}
              onClick={handleDeleteAll}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white h-9 px-4 gap-1.5 cursor-pointer shadow-xs shadow-rose-200"
            >
              {deletingAll && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationItem({
  n,
  isDeleting,
  onMarkRead,
  onDelete,
  onNavigate,
}: {
  n: CustomerNotification;
  isDeleting: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (n: CustomerNotification) => void;
}) {
  const { Icon, colour, bg, category } = getNotificationMeta(n.title);
  const isUnread = !n.is_read;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(n)}
      onKeyDown={(e) => e.key === "Enter" && onNavigate(n)}
      className={`
        group relative flex items-start gap-3.5 p-4 sm:p-5 cursor-pointer
        transition-all duration-150 outline-none
        ${isUnread ? "bg-rose-50/30 hover:bg-rose-50/60" : "hover:bg-slate-50/70"}
        ${isDeleting ? "opacity-40 pointer-events-none" : ""}
      `}
    >
      {/* Icon Container */}
      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${bg}`}>
        <Icon className={`h-4 w-4 ${colour}`} />
      </div>

      {/* Message & Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {category}
            </span>
            {isUnread && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" aria-label="Unread" />
            )}
          </div>

          <span className="text-[11px] font-medium text-slate-400 shrink-0">
            {relativeTime(n.created_at)}
          </span>
        </div>

        <h3
          className={`text-xs sm:text-sm leading-snug ${
            isUnread ? "font-bold text-slate-900" : "font-semibold text-slate-700"
          }`}
        >
          {typeof n.title === "string" ? n.title : String(n.title || "Notification")}
        </h3>

        <p className="text-xs text-slate-500 font-medium leading-relaxed">
          {typeof n.message === "string" ? n.message : String(n.message || "")}
        </p>
      </div>

      {/* Actions (Mark read + Individual Delete) */}
      <div className="flex items-center gap-1.5 shrink-0 self-center sm:self-start pt-0.5">
        {isUnread && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(n.id);
            }}
            className="text-[11px] font-bold text-primary opacity-0 group-hover:opacity-100 hover:underline transition-opacity px-1.5 py-1"
            title="Mark as read"
          >
            Mark read
          </button>
        )}

        {/* Individual Delete Action */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(n.id);
          }}
          disabled={isDeleting}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 sm:opacity-40 sm:group-hover:opacity-100 cursor-pointer"
          title="Delete notification"
          aria-label="Delete notification"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
