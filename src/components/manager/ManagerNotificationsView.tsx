import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Check,
  ShoppingBag,
  Truck,
  Package,
  Users,
  MessageSquare,
  Settings,
  Sparkles,
  RotateCcw,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";

export function ManagerNotificationsView() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Fetch real persistent staff notifications from public.notifications in Supabase
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: notifsData, error: notifErr } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (notifErr) throw notifErr;
      setNotifications(notifsData || []);
    } catch (err: any) {
      console.error("Failed to load notifications from Supabase:", err);
      setError(err.message || "Unable to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Supabase Realtime subscription on public.notifications
    const notifsChannel = supabase
      .channel("manager_notifications_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifsChannel);
    };
  }, [loadNotifications]);

  // Compute live unread count based on database state
  const unreadCount = useMemo(() => {
    return notifications.filter((n: any) => !n.is_read && !n.read).length;
  }, [notifications]);

  // Mark single notification as read in Supabase & navigate to corresponding view
  const handleNotificationClick = async (notif: any) => {
    const isUnread = !notif.is_read && !notif.read;

    if (isUnread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, read: true } : n))
      );

      try {
        await supabase
          .from("notifications")
          .update({ is_read: true, read: true })
          .eq("id", notif.id);
      } catch (err: any) {
        console.error("Failed to update notification status in Supabase:", err);
      }
    }

    const targetLink =
      notif.link ||
      ((notif.category || "").toLowerCase().includes("order")
        ? "/manager/orders"
        : "/manager/enquiries");
    navigate({ to: targetLink as any });
  };

  // Mark all notifications as read in Supabase database
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);

    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));

      const { error: updErr } = await supabase
        .from("notifications")
        .update({ is_read: true, read: true })
        .or("is_read.eq.false,read.eq.false");

      if (updErr) throw updErr;

      toast.success("All manager notifications marked as read");
      await loadNotifications();
    } catch (err: any) {
      toast.error("Failed to mark all as read: " + err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  // Permanently delete single notification from Supabase database
  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;
    const targetId = notificationToDelete.id;
    setDeleting(true);

    // Optimistically update UI immediately
    setNotifications((prev) => prev.filter((n) => n.id !== targetId));

    try {
      const { error: delErr } = await supabase
        .from("notifications")
        .delete()
        .eq("id", targetId);

      if (delErr) throw delErr;

      toast.success("Notification deleted successfully");
      setNotificationToDelete(null);
    } catch (err: any) {
      toast.error("Failed to delete notification: " + err.message);
      // Revert if error
      await loadNotifications();
    } finally {
      setDeleting(false);
    }
  };

  // Permanently delete ALL notifications from Supabase database
  const handleDeleteAll = async () => {
    setDeletingAll(true);
    // Optimistically update UI immediately
    setNotifications([]);

    try {
      const { error: delErr } = await supabase
        .from("notifications")
        .delete()
        .not("id", "is", null);

      if (delErr) throw delErr;

      toast.success("All manager notifications deleted successfully");
      setDeleteAllDialogOpen(false);
      await loadNotifications();
    } catch (err: any) {
      toast.error("Failed to delete all notifications: " + err.message);
      await loadNotifications();
    } finally {
      setDeletingAll(false);
    }
  };

  // Filter notifications based on tab (All vs Unread only)
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n: any) => {
      const isUnread = !n.is_read && !n.read;
      if (activeFilter === "unread") return isUnread;
      return true;
    });
  }, [notifications, activeFilter]);

  // Contextual icon selector
  const getCategoryIcon = (category: string) => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("order")) return <ShoppingBag className="h-3.5 w-3.5 text-blue-600" />;
    if (cat.includes("delivery") || cat.includes("truck"))
      return <Truck className="h-3.5 w-3.5 text-purple-600" />;
    if (cat.includes("inventory") || cat.includes("stock"))
      return <Package className="h-3.5 w-3.5 text-amber-600" />;
    if (cat.includes("customer") || cat.includes("user"))
      return <Users className="h-3.5 w-3.5 text-emerald-600" />;
    if (cat.includes("support") || cat.includes("enquiry"))
      return <MessageSquare className="h-3.5 w-3.5 text-rose-600" />;
    return <Settings className="h-3.5 w-3.5 text-slate-600" />;
  };

  // Relative time formatter
  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
  };

  const filterTabs = [
    { id: "all", label: "All", count: notifications.length },
    { id: "unread", label: "Unread", count: unreadCount },
  ];

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">
              Manager
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Notifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" /> Manager Notifications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time customer orders, support enquiries, and operational updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            variant="outline"
            className="rounded-full text-xs font-extrabold gap-1.5 border-slate-200 bg-white hover:bg-slate-50 text-foreground shrink-0 self-start sm:self-center"
          >
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            {markingAll ? "Marking all..." : "Mark all as read"}
          </Button>
        )}
      </div>

      {/* 2. FILTER TABS & DELETE ALL BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as "all" | "unread")}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-extrabold transition-all whitespace-nowrap border cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`px-1.5 py-0 text-[10px] font-black rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Clean Red Delete All Button */}
        {notifications.length > 0 && (
          <Button
            onClick={() => setDeleteAllDialogOpen(true)}
            disabled={deletingAll}
            className="rounded-full text-xs font-bold gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm border-transparent shrink-0 h-9 px-4 self-start sm:self-auto cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 text-white" />
            {deletingAll ? "Deleting all..." : "Delete All"}
          </Button>
        )}
      </div>

      {/* 3. NOTIFICATION LIST CONTAINER */}
      <div className="surface-card rounded-3xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 sm:p-5 flex items-start gap-3.5 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-40 bg-slate-100 rounded-md" />
                    <div className="h-3 w-16 bg-slate-100 rounded-md" />
                  </div>
                  <div className="h-3 w-3/4 bg-slate-100 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
            <h3 className="font-bold text-sm text-foreground">Unable to load notifications</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
            <Button
              onClick={loadNotifications}
              size="sm"
              variant="outline"
              className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white mt-2"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              {activeFilter === "unread" ? (
                <Sparkles className="h-6 w-6 text-emerald-500" />
              ) : (
                <Bell className="h-6 w-6" />
              )}
            </div>
            <h3 className="font-bold text-sm text-foreground">
              {activeFilter === "unread"
                ? "You're all caught up"
                : activeFilter === "all"
                ? "No notifications yet"
                : `No ${activeFilter} notifications`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeFilter === "unread"
                ? "There are no unread notifications right now."
                : "Customer orders, delivery updates and enquiries will appear here in real-time."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((n: any) => {
              const isUnread = !n.is_read && !n.read;
              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 sm:p-5 flex items-start justify-between gap-3.5 transition-colors cursor-pointer group ${
                    isUnread
                      ? "bg-slate-50/70 hover:bg-slate-100/70"
                      : "bg-white hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className={`p-2.5 rounded-2xl border shrink-0 transition-transform group-hover:scale-105 ${
                        isUnread
                          ? "bg-white border-slate-200/80 shadow-2xs"
                          : "bg-slate-50 border-slate-100"
                      }`}
                    >
                      {getCategoryIcon(n.category || n.type)}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs sm:text-sm tracking-tight truncate ${
                            isUnread
                              ? "font-extrabold text-foreground"
                              : "font-semibold text-slate-700"
                          }`}
                        >
                          {typeof n.title === "string" ? n.title : String(n.title || "Notification")}
                        </p>
                        {n.status === "Pending" && n.type === "order" && (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-800 border-blue-200 text-[9px] font-extrabold"
                          >
                            New Order
                          </Badge>
                        )}
                        {n.status === "Open" && n.type === "support" && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-extrabold"
                          >
                            Pending Review
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {typeof (n.message || n.description) === "string" ? (n.message || n.description) : String(n.message || n.description || "")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {formatRelativeTime(n.created_at)}
                    </span>
                    {isUnread && (
                      <span
                        className="h-2 w-2 rounded-full bg-primary shrink-0"
                        title="Unread notification"
                      />
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete notification"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotificationToDelete(n);
                      }}
                      className="h-7 w-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permanent Deletion Confirmation Modal */}
      <AlertDialog
        open={!!notificationToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setNotificationToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl p-6 bg-white border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-600" />
              Delete Notification Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <span className="text-foreground font-bold">
                "{notificationToDelete?.title}"
              </span>{" "}
              from the Supabase database? This record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-full text-xs font-bold h-9"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDeleteNotification}
              className="rounded-full text-xs font-bold h-9 bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? "Deleting..." : "Permanently Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete All Confirmation Modal */}
      <AlertDialog
        open={deleteAllDialogOpen}
        onOpenChange={(open) => {
          if (!open && !deletingAll) setDeleteAllDialogOpen(false);
        }}
      >
        <AlertDialogContent className="rounded-3xl p-6 bg-white border max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-black text-foreground flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              Delete All Notifications Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete all{" "}
              <strong className="text-foreground font-bold">
                {notifications.length}
              </strong>{" "}
              manager notifications from the database? This action will permanently remove all notifications and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={deletingAll}
              className="rounded-full text-xs font-bold h-9"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingAll}
              onClick={handleDeleteAll}
              className="rounded-full text-xs font-bold h-9 bg-red-600 hover:bg-red-700 text-white"
            >
              {deletingAll ? "Deleting..." : "Permanently Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
