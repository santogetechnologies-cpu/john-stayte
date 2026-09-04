import { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Mail,
  Search,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Calendar,
  Filter,
  Loader2,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

interface SubscriberRecord {
  id: string;
  email: string;
  source: string | null;
  status: string;
  created_at: string;
}

export function AdminNewsletterView() {
  const [subscribers, setSubscribers] = useState<SubscriberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Add Subscriber Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newSource, setNewSource] = useState("admin_manual");
  const [adding, setAdding] = useState(false);

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscribers((data as any) || []);
    } catch (err: any) {
      console.error("Failed to load newsletter subscribers:", err);
      toast.error("Failed to load newsletter subscribers: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();

    // Supabase Realtime subscription
    const channel = supabase
      .channel("admin_newsletter_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "newsletter_subscribers" },
        () => loadSubscribers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((s) => {
      const matchesSearch =
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.source || "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" ? true : s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [subscribers, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = subscribers.length;
    const active = subscribers.filter((s) => s.status === "active").length;
    const unsubscribed = subscribers.filter((s) => s.status === "unsubscribed").length;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recent = subscribers.filter((s) => new Date(s.created_at) >= thirtyDaysAgo).length;
    return { total, active, unsubscribed, recent };
  }, [subscribers]);

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return toast.error("Please enter a valid email address.");
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers").insert([
        {
          email: cleanEmail,
          source: newSource,
          status: "active",
        },
      ]);

      if (error) {
        if (error.code === "23505") {
          return toast.error("This email is already subscribed.");
        }
        throw error;
      }

      await logAdminAuditAction("ADD_SUBSCRIBER", "newsletter", cleanEmail, { source: newSource });
      toast.success(`Subscriber ${cleanEmail} added successfully!`);
      setNewEmail("");
      setAddModalOpen(false);
      loadSubscribers();
    } catch (err: any) {
      toast.error("Failed to add subscriber: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (subscriber: SubscriberRecord) => {
    const newStatus = subscriber.status === "active" ? "unsubscribed" : "active";
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ status: newStatus })
        .eq("id", subscriber.id);

      if (error) throw error;
      await logAdminAuditAction("UPDATE_SUBSCRIBER_STATUS", "newsletter", subscriber.email, {
        status: newStatus,
      });
      toast.success(`Status updated to ${newStatus}`);
      loadSubscribers();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleDeleteSubscriber = async (subscriber: SubscriberRecord) => {
    if (!confirm(`Are you sure you want to remove "${subscriber.email}" from subscribers?`)) return;
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("id", subscriber.id);

      if (error) throw error;
      await logAdminAuditAction("DELETE_SUBSCRIBER", "newsletter", subscriber.email);
      toast.success("Subscriber removed.");
      loadSubscribers();
    } catch (err: any) {
      toast.error("Failed to delete subscriber: " + err.message);
    }
  };

  const exportCSV = () => {
    if (subscribers.length === 0) {
      return toast.error("No subscribers to export.");
    }
    const headers = ["Email", "Source", "Status", "Subscribed At"];
    const rows = subscribers.map((s) => [
      `"${s.email}"`,
      `"${s.source || "website"}"`,
      `"${s.status}"`,
      `"${new Date(s.created_at).toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `jss_newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Subscriber CSV exported successfully!");
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
            <span className="text-foreground">Newsletter</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" /> Newsletter Subscribers ({subscribers.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            View, search, manage and export verified email subscribers collected across the
            storefront.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={exportCSV}
            className="rounded-full text-xs font-bold gap-1.5 shadow-2xs"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="rounded-full text-xs font-bold gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" /> Add Subscriber
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Total Subscribers
          </p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-muted-foreground">All registered emails</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Active Audience
          </p>
          <p className="text-3xl font-black text-emerald-600">{stats.active}</p>
          <p className="text-[11px] text-muted-foreground">Ready for broadcast</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Unsubscribed
          </p>
          <p className="text-3xl font-black text-slate-400">{stats.unsubscribed}</p>
          <p className="text-[11px] text-muted-foreground">Opted-out contacts</p>
        </div>

        <div className="surface-card p-5 rounded-3xl border bg-white shadow-2xs space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            New (Last 30 Days)
          </p>
          <p className="text-3xl font-black text-primary">{stats.recent}</p>
          <p className="text-[11px] text-muted-foreground">Recent signups</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card p-4 rounded-3xl border bg-white shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email address or source..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 rounded-full text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading subscribers from Supabase...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No subscribers found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Subscribers who sign up via the website footer or blog will appear here.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Email Address</TableHead>
                <TableHead className="font-bold text-xs">Origin Source</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs">Subscribed Date</TableHead>
                <TableHead className="font-bold text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((s) => (
                <TableRow key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-bold text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {s.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-foreground">{s.email}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground font-mono">
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px] font-medium bg-slate-50"
                    >
                      {s.source || "website_footer"}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs">
                    <button
                      onClick={() => toggleStatus(s)}
                      className="cursor-pointer focus:outline-hidden"
                      title="Click to toggle status"
                    >
                      {s.status === "active" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full hover:bg-emerald-100 transition-colors">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full hover:bg-slate-200 transition-colors">
                          <XCircle className="h-3 w-3" /> Unsubscribed
                        </span>
                      )}
                    </button>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>

                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSubscriber(s)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Subscriber Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <form onSubmit={handleAddSubscriber}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" /> Add Newsletter Subscriber
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manually register a customer email to the John Stayte Services newsletter audience.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                  Email Address
                </label>
                <Input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="customer@example.co.uk"
                  className="rounded-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                  Origin / Channel
                </label>
                <Select value={newSource} onValueChange={setNewSource}>
                  <SelectTrigger className="rounded-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin_manual">Admin Manual Addition</SelectItem>
                    <SelectItem value="phone_order">Telephone Order Customer</SelectItem>
                    <SelectItem value="forecourt_depot">Forecourt Depot Counter</SelectItem>
                    <SelectItem value="trade_account">Trade Account Application</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adding} className="rounded-full text-xs font-bold">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Subscriber"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
