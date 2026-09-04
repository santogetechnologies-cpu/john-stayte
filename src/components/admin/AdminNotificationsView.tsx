import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  ShoppingBag,
  Package,
  Truck,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

export function AdminNotificationsView() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterUnreadOnly, setFilterUnreadOnly] = useState<boolean>(false);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err: any) {
      toast.error("Failed to load notifications: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      toast.success("Notification marked as read");
      window.dispatchEvent(new Event("admin_modules_updated"));
    } catch (err: any) {
      toast.error("Failed to update notification: " + err.message);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return toast.info("All notifications are already read.");

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadIds);

      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
      window.dispatchEvent(new Event("admin_modules_updated"));
    } catch (err: any) {
      toast.error("Failed to mark all as read: " + err.message);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notification deleted");
      window.dispatchEvent(new Event("admin_modules_updated"));
    } catch (err: any) {
      toast.error("Failed to delete notification: " + err.message);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const isUnread = !n.read;
    if (filterUnreadOnly && !isUnread) return false;

    if (filterCategory !== "all") {
      const cat = (n.category || "").toLowerCase();
      if (!cat.includes(filterCategory.toLowerCase())) return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = (n.title || "").toLowerCase().includes(query);
      const msgMatch = (n.message || "").toLowerCase().includes(query);
      if (!titleMatch && !msgMatch) return false;
    }

    return true;
  });

  const getCategoryIcon = (category: string | null) => {
    const cat = (category || "").toLowerCase();
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">
              Admin
            </Link>
            <span>/</span>
            <span className="text-foreground">Notifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" /> Admin Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time operational alerts and order status updates persisted in Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold gap-1.5 border-slate-200"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" /> Mark All as Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notification alerts..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 rounded-xl text-xs font-bold h-9 border-slate-200">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="order">Orders</SelectItem>
              <SelectItem value="stock">Inventory</SelectItem>
              <SelectItem value="delivery">Deliveries</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
            variant={filterUnreadOnly ? "default" : "outline"}
            size="sm"
            className={`rounded-full text-xs font-bold h-9 ${
              filterUnreadOnly ? "bg-primary text-white" : "border-slate-200"
            }`}
          >
            {filterUnreadOnly ? "Showing Unread" : "Show Unread Only"}
          </Button>
        </div>
      </div>

      {/* NOTIFICATION LIST CONTAINER */}
      <div className="space-y-3">
        {loading ? (
          <div className="surface-card p-12 text-center text-xs font-bold text-muted-foreground flex items-center justify-center gap-2 rounded-3xl border bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Querying Supabase notification
            records...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="surface-card p-16 text-center rounded-3xl border bg-white space-y-3">
            <Bell className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="font-extrabold text-base text-foreground">No notifications yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Real system events, order placements, and stock alerts will appear here automatically.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isUnread = !n.read;
            return (
              <div
                key={n.id}
                className={`surface-card p-5 rounded-3xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
                  isUnread
                    ? "bg-amber-50/40 border-amber-200/80"
                    : "bg-white border-slate-200/70 opacity-90"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 ${
                      isUnread
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {getCategoryIcon(n.category)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-foreground">
                        {typeof n.title === "string" ? n.title : String(n.title || "Notification")}
                      </span>
                      {isUnread && (
                        <Badge className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                          New Alert
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="bg-white text-slate-600 text-[10px] font-bold"
                      >
                        {typeof n.category === "string" ? n.category : "System"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {typeof n.message === "string" ? n.message : String(n.message || "")}
                    </p>
                    <p className="text-[10px] font-medium text-slate-400">
                      {new Date(n.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {isUnread && (
                    <Button
                      onClick={() => markAsRead(n.id)}
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 h-8 gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Mark Read
                    </Button>
                  )}
                  <Button
                    onClick={() => deleteNotification(n.id)}
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
