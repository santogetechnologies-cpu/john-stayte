import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

export function AdminAuditView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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
      toast.error("Failed to load audit logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const filtered = logs.filter((l) => {
    return (
      (l.actor_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.action || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-foreground">Audit Logs</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            System Audit Trail ({logs.length})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Immutable system event logs recorded in Supabase database.
          </p>
        </div>
      </div>

      <div className="surface-card p-4 rounded-3xl border bg-white flex items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit trail by actor or action..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs"
          />
        </div>
      </div>

      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold">
            Loading audit logs from Supabase...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Activity className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h3 className="font-bold text-sm text-foreground">No audit logs recorded</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              System events and administrative changes will log here automatically.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Timestamp</TableHead>
                <TableHead className="font-bold text-xs">Actor</TableHead>
                <TableHead className="font-bold text-xs">Action</TableHead>
                <TableHead className="font-bold text-xs">Target Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id} className="hover:bg-slate-50/60">
                  <TableCell className="text-xs text-muted-foreground font-medium">
                    {new Date(l.created_at).toLocaleString("en-GB")}
                  </TableCell>
                  <TableCell className="font-bold text-xs text-foreground">{l.actor_name}</TableCell>
                  <TableCell className="text-xs font-semibold">{l.action}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-100 font-bold text-[10px]">
                      {l.target_type || "System"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
