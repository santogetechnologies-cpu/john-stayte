import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  ChevronRight,
  CheckCheck,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ShoppingBag,
  Info,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { isPendingBranchAssignment, resolveBranchInfo } from "@/lib/branch-service";
import { toast } from "sonner";

export interface BranchNotificationItem {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  category: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export function BranchNotificationsView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);
  const branchInfo = resolveBranchInfo(assignedBranch, user?.assignedBranchId);

  const [notifications, setNotifications] = useState<BranchNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user || isPending) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const branchTown = branchInfo?.town?.toLowerCase() || "";
      const branchName = assignedBranch.toLowerCase();

      // Query real notifications from public.notifications table
      const { data, error: fetchErr } = await (supabase.from("notifications") as any)
        .select("id, user_id, title, message, category, link, read, is_read, created_at")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchErr) {
        throw new Error(fetchErr.message);
      }

      const rows: any[] = data || [];

      // Filter to prevent cross-branch notification access:
      // Include notifications explicitly assigned to this staff member (user_id === user.id)
      // Or broadcast notifications whose message/title explicitly mentions this forecourt location
      const scoped = rows.filter((item) => {
        if (item.user_id === user.id) return true;
        const text = `${item.title || ""} ${item.message || ""} ${item.link || ""}`.toLowerCase();
        if (item.link && item.link.includes("/branch/")) {
          if (branchTown && text.includes(branchTown)) return true;
          if (text.includes(branchName)) return true;
        }
        return false;
      });

      const formatted: BranchNotificationItem[] = scoped.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title || "Branch Notification",
        message: row.message || "",
        category: row.category || "Orders",
        link: row.link,
        read: Boolean(row.read || row.is_read),
        createdAt: row.created_at || new Date().toISOString(),
      }));

      setNotifications(formatted);
    } catch (err: any) {
      console.error("Failed to load branch notifications:", err);
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user, isPending, assignedBranch, branchInfo]);

  useEffect(() => {
    loadNotifications();

    if (!isPending && user?.id) {
      const channel = supabase
        .channel("branch_notifications_sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadNotifications, isPending, user?.id]);

  const markAllRead = async () => {
    if (notifications.length === 0) return;
    try {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await (supabase.from("notifications") as any)
          .update({ read: true, is_read: true })
          .in("id", unreadIds);
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read.");
    } catch (err) {
      console.warn("Notice updating notifications:", err);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await (supabase.from("notifications") as any)
        .update({ read: true, is_read: true })
        .eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn("Notice updating notification:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/branch" className="hover:text-slate-700 transition-colors">
          Branch
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">Branch Notifications</span>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Branch Notifications
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${
                isPending
                  ? "bg-[#FFF7E6] text-[#92400E] border-[#FDE68A]"
                  : "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPending ? "bg-[#D97706] animate-pulse" : "bg-emerald-500"
                }`}
              />
              📍 {assignedBranch}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Real-time push alerts, collection reminders, and order arrivals for {assignedBranch}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllRead}
              className="h-9 rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs px-4 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5 text-slate-500" />
              <span>Mark all read ({unreadCount})</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={loadNotifications}
            className="h-9 rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs px-3.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* PENDING NOTICE */}
      {isPending && (
        <div className="surface-card p-4 sm:p-4.5 rounded-[20px] border border-[#FDE68A] bg-[#FFF7E6] backdrop-blur-md shadow-xs flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <p className="font-extrabold text-[#92400E]">Awaiting Branch Assignment</p>
            <p className="text-[#92400E]/85 leading-relaxed text-[11px]">
              Staff account must be assigned to an active forecourt branch before notifications can be accessed.
            </p>
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="surface-card p-4 rounded-[20px] border border-rose-200 bg-rose-50 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={loadNotifications}
            className="rounded-full text-xs font-bold h-7 px-3 bg-white border-rose-200 hover:bg-rose-100"
          >
            Retry
          </Button>
        </div>
      )}

      {/* NOTIFICATIONS CONTENT */}
      <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-slate-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading branch notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2.5">
            <div className="h-12 w-12 rounded-2xl bg-slate-100/80 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto shadow-2xs">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">No notifications yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              When new Click &amp; Collect orders arrive or operational updates occur for {assignedBranch}, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => {
              const timeFormatted = new Date(item.createdAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={item.id}
                  onClick={() => !item.read && markAsRead(item.id)}
                  className={`rounded-2xl border p-4 transition-all flex items-start gap-3.5 shadow-2xs ${
                    item.read
                      ? "bg-white/60 border-white/80 opacity-80"
                      : "bg-white border-blue-200/80 shadow-xs"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 ${
                      item.read
                        ? "bg-slate-100 text-slate-500 border-slate-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {item.category.toLowerCase().includes("order") ? (
                      <ShoppingBag className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-slate-900">{item.title}</h4>
                        {!item.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 inline-block" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {timeFormatted}
                      </span>
                    </div>

                    <p className="text-slate-600 leading-relaxed font-medium">{item.message}</p>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                        {item.category}
                      </Badge>

                      {item.link && (
                        <Link
                          to={item.link as any}
                          className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                        >
                          <span>View Details</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
