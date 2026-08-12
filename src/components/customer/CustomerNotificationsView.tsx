import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerNotificationsView() {
  const { user } = useStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
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
      setNotifications(data || []);
    } catch (err: any) {
      console.error("Notifications load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await supabase.from("customer_notifications").update({ is_read: true }).eq("id", id);
      toast.success("Notification marked as read");
      await loadNotifications();
    } catch (err: any) {
      toast.error("Error updating notification: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
          <span>/</span>
          <span className="text-foreground font-bold">Notifications</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Notifications
        </h1>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs font-bold text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
          Loading notifications from Supabase...
        </div>
      ) : notifications.length === 0 ? (
        <div className="surface-card p-12 sm:p-16 text-center rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="p-4 rounded-full bg-slate-100 text-slate-500 w-fit mx-auto">
            <Bell className="h-10 w-10" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-black text-lg text-foreground">You're all caught up</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No new notifications at the moment. Order status updates and messages will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`surface-card p-5 rounded-3xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                !n.is_read ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-foreground">{n.title}</h3>
                  {!n.is_read && (
                    <Badge variant="outline" className="bg-primary text-primary-foreground text-[9px] font-extrabold uppercase">
                      New
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/70">
                  {new Date(n.created_at).toLocaleString("en-GB")}
                </p>
              </div>

              {!n.is_read && (
                <Button
                  onClick={() => markAsRead(n.id)}
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs font-bold gap-1 self-start sm:self-center shrink-0"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Mark as Read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
