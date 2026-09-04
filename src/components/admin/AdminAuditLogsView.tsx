import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Search, Filter, Calendar as CalendarIcon, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

export function AdminAuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error("Failed to load audit trail: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (
      targetTypeFilter !== "all" &&
      (l.target_type || "").toLowerCase() !== targetTypeFilter.toLowerCase()
    ) {
      return false;
    }

    if (
      actionFilter !== "all" &&
      !(l.action || "").toLowerCase().includes(actionFilter.toLowerCase())
    ) {
      return false;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const actorMatch = (l.actor_name || "").toLowerCase().includes(query);
      const actionMatch = (l.action || "").toLowerCase().includes(query);
      const targetMatch = (l.target_type || "").toLowerCase().includes(query);
      const idMatch = (l.target_id || "").toLowerCase().includes(query);
      if (!actorMatch && !actionMatch && !targetMatch && !idMatch) return false;
    }

    return true;
  });

  const getActionBadgeColor = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CREATE")) return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (act.includes("UPDATE") || act.includes("EDIT"))
      return "bg-blue-100 text-blue-800 border-blue-200";
    if (act.includes("DELETE") || act.includes("REMOVE"))
      return "bg-red-100 text-red-800 border-red-200";
    if (act.includes("ENABLE") || act.includes("PUBLISH"))
      return "bg-teal-100 text-teal-800 border-teal-200";
    if (act.includes("DISABLE") || act.includes("UNPUBLISH"))
      return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-800 border-slate-200";
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
            <span className="text-foreground">Audit Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" /> Security Audit Trail ({logs.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Administrative activity, product updates, and configuration events.
          </p>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="surface-card p-4 rounded-3xl border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by actor, action, or target..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
            <SelectTrigger className="w-36 rounded-xl text-xs font-bold h-9 border-slate-200">
              <SelectValue placeholder="Target Module" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Modules</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="order">Orders</SelectItem>
              <SelectItem value="offer">Offers</SelectItem>
              <SelectItem value="coupon">Coupons</SelectItem>
              <SelectItem value="category">Categories</SelectItem>
              <SelectItem value="banner">Banners</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
              <SelectItem value="faq">FAQs</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-32 rounded-xl text-xs font-bold h-9 border-slate-200">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="enable">Enable</SelectItem>
              <SelectItem value="disable">Disable</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading audit records...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <ShieldCheck className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="font-extrabold text-base text-foreground">No audit logs found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Administrative CUD operations will record here automatically in real time.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Timestamp</TableHead>
                <TableHead className="font-bold text-xs">Actor / Admin</TableHead>
                <TableHead className="font-bold text-xs">Action Executed</TableHead>
                <TableHead className="font-bold text-xs">Module Target</TableHead>
                <TableHead className="font-bold text-xs text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((l) => (
                <TableRow key={l.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString("en-GB")}
                  </TableCell>
                  <TableCell className="font-extrabold text-xs text-foreground">
                    {l.actor_name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`font-extrabold text-[10px] border ${getActionBadgeColor(l.action)}`}
                    >
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="bg-slate-50 font-bold text-[10px] capitalize"
                    >
                      {l.target_type || "System"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => setSelectedLog(l)}
                      variant="ghost"
                      size="sm"
                      className="rounded-xl h-8 text-xs font-bold gap-1 text-slate-600 hover:text-foreground"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Audit Log Event Details</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 text-xs pt-2">
              <div className="p-3 rounded-2xl bg-slate-50 border space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  Action & Actor
                </p>
                <p className="font-black text-foreground">
                  {selectedLog.action} by {selectedLog.actor_name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {new Date(selectedLog.created_at).toLocaleString("en-GB")}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  Target Entity
                </p>
                <p className="font-extrabold text-foreground capitalize">
                  Module: {selectedLog.target_type || "System"}
                </p>
                {selectedLog.target_id && (
                  <p className="text-[11px] font-mono text-slate-600">
                    ID: {selectedLog.target_id}
                  </p>
                )}
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="p-3 rounded-2xl bg-slate-50 border space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">
                    Metadata Payload
                  </p>
                  <pre className="text-[11px] bg-white p-2.5 rounded-xl border font-mono overflow-x-auto text-slate-700">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-end pt-3">
                <Button
                  onClick={() => setSelectedLog(null)}
                  className="rounded-full text-xs font-bold px-6"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
