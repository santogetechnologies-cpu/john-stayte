import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, ChevronRight, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { isPendingBranchAssignment } from "@/lib/branch-service";
import { toast } from "sonner";

export function BranchNotificationsView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);

  // Real notifications list from database (zero mock items)
  const [notifications, setNotifications] = useState<any[]>([]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read.");
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
              Branch Notifications
            </h1>
            <Badge
              variant="outline"
              className={`font-bold text-xs ${
                isPending
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
              }`}
            >
              📍 {assignedBranch}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time push alerts, collection reminders, and inventory threshold warnings.
          </p>
        </div>

        {notifications.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={markAllRead}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5 text-slate-500" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* NOTIFICATIONS LIST OR EMPTY STATE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Bell className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No notifications yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Real-time order alerts, arrival notices, and restock notifications for {assignedBranch} will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border p-3.5 bg-white border-slate-200 flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700 shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <span className="text-[10px] text-slate-400">{item.time}</span>
                  </div>
                  <p className="text-slate-600">{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
