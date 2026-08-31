import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  Search,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Tag,
  AlertCircle,
  Loader2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { logAdminAuditAction } from "@/lib/audit";

export function ManagerEnquiriesView() {
  const { user } = useStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Selected Ticket Detail & Messages
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .neq("customer_email", "deleted_test_ticket@jss.com")
        .neq("customer_email", "admin@jss.com")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const loaded = data || [];
      setTickets(loaded);

      // Check if ticketId query parameter is present in URL
      const urlParams = new URLSearchParams(window.location.search);
      const targetTicketId = urlParams.get("ticketId");
      if (targetTicketId && loaded.length > 0) {
        const found = loaded.find((t) => t.id === targetTicketId);
        if (found) {
          setSelectedTicket(found);
          loadTicketMessages(found.id);
        }
      }
    } catch (err: any) {
      toast.error("Failed to load customer enquiries: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTicketMessages(data || []);
    } catch (err: any) {
      toast.error("Failed to load message history: " + err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadTickets();

    // Supabase Realtime Subscription for tickets
    const channel = supabase
      .channel("manager_support_tickets_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => loadTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const openTicketDrawer = (t: any) => {
    setSelectedTicket(t);
    loadTicketMessages(t.id);
    logAdminAuditAction("VIEWED_ENQUIRY", "ticket", t.id, { ticket_number: t.ticket_number });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);

    try {
      const managerName = user?.name || "John Stayte Operations Manager";
      const managerId = user?.id || null;

      // 1. Insert message into support_messages
      const { error: msgErr } = await supabase.from("support_messages").insert([
        {
          ticket_id: selectedTicket.id,
          sender_id: managerId,
          sender_name: managerName,
          sender_role: "manager",
          message: replyText.trim(),
          text: replyText.trim(),
        },
      ]);

      if (msgErr) throw msgErr;

      // 2. Update ticket status & last_updated timestamp
      const newStatus = selectedTicket.status === "Open" ? "In Progress" : selectedTicket.status;
      const { error: ticketErr } = await supabase
        .from("support_tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);

      if (ticketErr) throw ticketErr;

      // 3. Create Audit Log
      await logAdminAuditAction("REPLIED_TO_ENQUIRY", "ticket", selectedTicket.id, {
        ticket_number: selectedTicket.ticket_number,
        reply: replyText.substring(0, 50),
      });

      // 4. Create Notification for Customer in customer_notifications table
      if (selectedTicket.customer_id) {
        const { error: notifErr } = await supabase.from("customer_notifications").insert([
          {
            user_id: selectedTicket.customer_id,
            title: `Support Update: Ticket #${selectedTicket.ticket_number || selectedTicket.id.slice(0, 8)}`,
            message: `Manager response: ${replyText.substring(0, 100)}`,
            category: "Support",
            is_read: false,
          },
        ]);
        if (notifErr) {
          console.error("Customer notification error:", notifErr);
        }
      }

      toast.success("Response sent successfully to customer!");
      setReplyText("");

      // Reload conversation messages & updated list
      await loadTicketMessages(selectedTicket.id);
      await loadTickets();
    } catch (err: any) {
      toast.error("Failed to send reply: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status: newStatus as any, updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      await logAdminAuditAction("CHANGED_TICKET_STATUS", "ticket", selectedTicket.id, { newStatus });
      setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Ticket status updated to ${newStatus}`);
      loadTickets();
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    }
  };

  const handleUpdatePriority = async (newPriority: string) => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase
        .from("support_tickets")
        .update({ priority: newPriority as any, updated_at: new Date().toISOString() })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      await logAdminAuditAction("CHANGED_TICKET_PRIORITY", "ticket", selectedTicket.id, { newPriority });
      setSelectedTicket((prev: any) => ({ ...prev, priority: newPriority }));
      toast.success(`Ticket priority updated to ${newPriority}`);
      loadTickets();
    } catch (err: any) {
      toast.error("Failed to update priority: " + err.message);
    }
  };

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const numMatch = (t.ticket_number || t.id).toLowerCase().includes(query);
      const nameMatch = (t.customer_name || "").toLowerCase().includes(query);
      const emailMatch = (t.customer_email || "").toLowerCase().includes(query);
      const subjMatch = (t.subject || "").toLowerCase().includes(query);
      if (!numMatch && !nameMatch && !emailMatch && !subjMatch) return false;
    }

    return true;
  });

  const openOrPendingCount = tickets.filter((t) => t.status !== "Resolved" && t.status !== "Closed").length;

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "Urgent": return "bg-red-100 text-red-800 border-red-200 font-bold";
      case "High": return "bg-amber-100 text-amber-800 border-amber-200 font-bold";
      case "Medium": return "bg-blue-100 text-blue-800 border-blue-200 font-bold";
      default: return "bg-slate-100 text-slate-700 border-slate-200 font-bold";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Resolved": return "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
      case "In Progress": return "bg-blue-100 text-blue-800 border-blue-200 font-bold";
      case "Waiting": return "bg-purple-100 text-purple-800 border-purple-200 font-bold";
      default: return "bg-amber-100 text-amber-800 border-amber-200 font-bold";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">Manager</Link>
            <span>/</span>
            <span className="text-foreground">Enquiries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Customer Support & Enquiry Tickets ({openOrPendingCount})
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage and respond to customer enquiries and support requests.
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
            placeholder="Search ticket #, customer name, or subject..."
            className="pl-9 rounded-full bg-slate-50 border-slate-200 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 rounded-xl text-xs font-bold h-9 border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Waiting">Waiting</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36 rounded-xl text-xs font-bold h-9 border-slate-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TICKET TABLE CONTAINER */}
      <div className="surface-card rounded-3xl border bg-white overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground font-bold flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" /> Querying support tickets from Supabase...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="font-extrabold text-base text-foreground">No customer enquiries yet.</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Submitted customer support requests will appear here in real time.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="font-bold text-xs">Ticket #</TableHead>
                <TableHead className="font-bold text-xs">Customer</TableHead>
                <TableHead className="font-bold text-xs">Subject</TableHead>
                <TableHead className="font-bold text-xs">Priority</TableHead>
                <TableHead className="font-bold text-xs">Status</TableHead>
                <TableHead className="font-bold text-xs">Created</TableHead>
                <TableHead className="font-bold text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <TableCell className="font-black text-xs text-foreground whitespace-nowrap">
                    #{t.ticket_number || t.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-bold text-foreground">{typeof t.customer_name === "string" ? t.customer_name : String(t.customer_name || "")}</p>
                    <p className="text-[10px] text-muted-foreground">{typeof t.customer_email === "string" ? t.customer_email : String(t.customer_email || "")}</p>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-foreground truncate max-w-[200px]">
                    {typeof t.subject === "string" ? t.subject : String(t.subject || "")}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${getPriorityBadgeClass(t.priority)}`}>
                      {t.priority || "Medium"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${getStatusBadgeClass(t.status)}`}>
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                    {new Date(t.created_at).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openTicketDrawer(t)}
                      className="rounded-xl text-xs font-bold gap-1 text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4" /> Respond
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* RESPOND TICKET DRAWER */}
      <Sheet open={Boolean(selectedTicket)} onOpenChange={() => setSelectedTicket(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-6 bg-white overflow-y-auto">
          {selectedTicket && (
            <div className="space-y-6 text-xs">
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <Badge className={`text-[10px] ${getStatusBadgeClass(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </Badge>
                  <Badge className={`text-[10px] ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                    {selectedTicket.priority} Priority
                  </Badge>
                </div>
                <SheetTitle className="font-black text-xl text-foreground mt-2">
                  Ticket #{selectedTicket.ticket_number || selectedTicket.id.slice(0, 8)}
                </SheetTitle>
                <p className="font-extrabold text-sm text-foreground">{typeof selectedTicket.subject === "string" ? selectedTicket.subject : String(selectedTicket.subject || "")}</p>
                <p className="text-xs text-muted-foreground">
                  Customer: <span className="font-bold text-foreground">{typeof selectedTicket.customer_name === "string" ? selectedTicket.customer_name : String(selectedTicket.customer_name || "")}</span> ({typeof selectedTicket.customer_email === "string" ? selectedTicket.customer_email : String(selectedTicket.customer_email || "")})
                </p>
              </SheetHeader>

              {/* TICKET ACTIONS TOOLBAR */}
              <div className="p-3 rounded-2xl bg-slate-50 border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Status:</span>
                  <Select value={selectedTicket.status} onValueChange={handleUpdateStatus}>
                    <SelectTrigger className="w-32 rounded-xl text-xs font-bold h-8 border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Waiting">Waiting</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Priority:</span>
                  <Select value={selectedTicket.priority} onValueChange={handleUpdatePriority}>
                    <SelectTrigger className="w-28 rounded-xl text-xs font-bold h-8 border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CONVERSATION TIMELINE */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-foreground">Conversation History</h4>
                {loadingMessages ? (
                  <div className="py-8 text-center text-muted-foreground font-bold flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading messages...
                  </div>
                ) : ticketMessages.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border text-center text-muted-foreground">
                    No replies recorded for this ticket yet.
                  </div>
                ) : (
                  ticketMessages.map((m) => {
                    const isManager = m.sender_role === "manager" || m.sender_role === "Manager";
                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-2xl border space-y-1 ${
                          isManager ? "bg-blue-50/50 border-blue-200/80 ml-4" : "bg-slate-50 border-slate-200 mr-4"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-extrabold text-foreground">
                            {m.sender_name || (isManager ? "Operations Manager" : "Customer")}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(m.created_at).toLocaleString("en-GB")}
                          </span>
                        </div>
                        <p className="text-xs text-foreground leading-relaxed pt-1">
                          {typeof (m.message || m.text) === "string" ? (m.message || m.text) : String(m.message || m.text || "")}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* REPLY FORM */}
              <form onSubmit={handleSendReply} className="space-y-3 pt-4 border-t">
                <label className="font-extrabold text-sm text-foreground">Write Manager Response</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to send to the customer..."
                  className="rounded-2xl text-xs font-medium border-slate-200"
                  rows={4}
                  required
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => handleUpdateStatus("Resolved")}
                    variant="outline"
                    className="rounded-full text-xs font-bold gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark as Resolved
                  </Button>
                  <Button
                    type="submit"
                    disabled={sending}
                    className="flex-1 rounded-full font-extrabold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                  >
                    <Send className="h-3.5 w-3.5" /> {sending ? "Sending Reply..." : "Send Reply"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
