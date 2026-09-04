import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  HelpCircle,
  Send,
  Loader2,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogIn,
  History,
  MessageSquareText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStore, gbp } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerSupportView() {
  const { user } = useStore();
  const navigate = useNavigate();

  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Request History Modal & Expanded Item State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Simple Form Fields
  const [message, setMessage] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("none");

  // Retrieve & Recover Authenticated Supabase User Session
  const getAuthenticatedUser = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let session = sessionData?.session;

      if (!session || (session.expires_at && session.expires_at * 1000 - Date.now() < 60000)) {
        const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshData?.session) {
          session = refreshData.session;
        }
      }

      if (session?.user) {
        return session.user;
      }

      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        return userData.user;
      }
    } catch (err) {
      console.error("Session recovery error:", err);
    }
    return null;
  };

  // Load support requests belonging 100% to the authenticated customer's auth.uid()
  const loadData = async () => {
    setLoading(true);
    setSessionExpired(false);
    try {
      const activeUser = await getAuthenticatedUser();
      if (!activeUser) {
        setSessionExpired(true);
        setLoading(false);
        return;
      }

      // 1. Fetch support requests filtered strictly by customer_id = auth.uid() from REAL Supabase DB
      const { data: requests, error: reqErr } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("customer_id", activeUser.id)
        .order("created_at", { ascending: false });

      if (reqErr) throw reqErr;
      setSupportRequests(requests || []);

      // 2. Fetch customer's real orders for optional order selection
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, total, created_at, status")
        .or(`customer_email.eq.${activeUser.email},customer_id.eq.${activeUser.id}`)
        .order("created_at", { ascending: false });

      if (orders) {
        setCustomerOrders(orders);
      }
    } catch (err: any) {
      console.error("Support data query error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Setup Supabase Realtime subscription for customer support ticket status changes
    const channel = supabase
      .channel("customer_support_tickets_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () =>
        loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Handle Real Supabase Support Request Submission
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Please describe your issue before sending.");
      return;
    }

    setSubmitting(true);
    setSessionExpired(false);

    try {
      const activeUser = await getAuthenticatedUser();

      if (!activeUser) {
        setSessionExpired(true);
        toast.error("Your session has expired. Please sign in again.", {
          action: {
            label: "Sign In",
            onClick: () => navigate({ to: "/login" }),
          },
        });
        setSubmitting(false);
        return;
      }

      const currentEmail = activeUser.email || user?.email || "";
      const chosenOrder =
        selectedOrderId !== "none" ? customerOrders.find((o) => o.id === selectedOrderId) : null;

      // Derive short topic title from first line of message
      const cleanMessage = message.trim();
      const firstLine = cleanMessage.split("\n")[0];
      let derivedSubject = firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine;
      if (chosenOrder) {
        derivedSubject = `Order #${chosenOrder.order_number} - ${derivedSubject}`;
      } else if (!derivedSubject) {
        derivedSubject = "General Support Request";
      }

      const generatedTicketNumber = `TKT-${Math.floor(Math.random() * 89999 + 10000)}`;

      // 1. Insert support request into REAL Supabase database associated strictly with activeUser.id
      const { data: insertedTicket, error: insertErr } = await supabase
        .from("support_tickets")
        .insert([
          {
            ticket_number: generatedTicketNumber,
            customer_id: activeUser.id,
            customer_email: currentEmail,
            customer_name: user?.name || "Customer",
            subject: derivedSubject,
            category: chosenOrder ? "Order & Delivery" : "General Inquiry",
            order_id: chosenOrder ? chosenOrder.id : null,
            description: cleanMessage,
            status: "Open",
            priority: "Medium",
          },
        ])
        .select()
        .single();

      if (insertErr) {
        console.error("Support request insert error:", insertErr);

        const isAuthErr =
          insertErr.message?.toLowerCase().includes("jwt") ||
          insertErr.message?.toLowerCase().includes("expired") ||
          insertErr.code === "PGRST301";

        if (isAuthErr) {
          setSessionExpired(true);
          toast.error("Your session has expired. Please sign in again.", {
            action: {
              label: "Sign In",
              onClick: () => navigate({ to: "/login" }),
            },
          });
        } else {
          toast.error("Unable to send request. Please try again.");
        }
        return;
      }

      // 2. Persist Customer Confirmation in customer_notifications
      try {
        await supabase.from("customer_notifications").insert([
          {
            user_id: activeUser.id,
            title: `Support Request Submitted #${generatedTicketNumber}`,
            message: `Your request "${derivedSubject}" has been received. Our team will respond shortly.`,
            category: "Support",
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.error("Failed to insert customer confirmation notification:", notifErr);
      }

      // 3. Persist Real Staff Notification in public.notifications for Operations Managers & Admins
      try {
        await (supabase.from("notifications") as any).insert([
          {
            user_id: null,
            title: `New Support Request #${generatedTicketNumber}`,
            message: `Customer ${user?.name || "Customer"} submitted support request: "${derivedSubject}".`,
            category: "Support",
            link: `/manager/enquiries?ticketId=${insertedTicket.id}`,
            read: false,
            is_read: false,
          },
        ]);
      } catch (staffNotifErr) {
        console.error("Failed to insert staff ticket notification:", staffNotifErr);
      }

      // Clean success feedback
      toast.success("Request sent successfully", {
        description: "Your support request has been sent to our support team.",
      });

      setMessage("");
      setSelectedOrderId("none");

      // Re-query REAL Supabase database to update Request History count & list
      await loadData();
    } catch (err: any) {
      console.error("Send request exception:", err);
      toast.error("Unable to send request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Resolved
          </Badge>
        );
      case "Closed":
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-extrabold flex items-center gap-1"
          >
            Closed
          </Badge>
        );
      case "In Progress":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-extrabold flex items-center gap-1"
          >
            <Clock className="h-3 w-3 text-blue-600" /> In Progress
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-extrabold flex items-center gap-1"
          >
            <Clock className="h-3 w-3 text-amber-600" /> Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/account" className="hover:text-primary transition-colors">
              Account
            </Link>
            <span>/</span>
            <span className="text-foreground font-bold">Help & Support</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-7 w-7 text-primary" /> Help & Support
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tell us what you need help with and our support team will assist you.
          </p>
        </div>

        {/* Secondary Request History Control */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setHistoryModalOpen(true)}
          className="rounded-full font-extrabold text-xs gap-2 border-slate-300 hover:bg-white text-foreground shrink-0 self-start sm:self-center"
        >
          <History className="h-4 w-4 text-primary" /> Request History
          {supportRequests.length > 0 && (
            <Badge className="ml-1 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-black">
              {supportRequests.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* SESSION EXPIRED BANNER */}
      {sessionExpired && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-extrabold text-amber-900 text-sm">Your session has expired.</p>
              <p className="text-amber-800 font-medium mt-0.5">
                Please sign in again to submit support requests.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: "/login" })}
            size="sm"
            className="rounded-full font-extrabold text-xs gap-1.5 bg-primary text-white shrink-0 self-start sm:self-center"
          >
            <LogIn className="h-3.5 w-3.5" /> Sign In
          </Button>
        </div>
      )}

      {/* 2. CENTERED MAIN SUPPORT CARD */}
      <div className="surface-card p-6 sm:p-10 rounded-3xl border border-slate-200/80 bg-white space-y-6 shadow-xs max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-foreground">How can we help?</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Describe your issue and our support team will get back to you.
          </p>
        </div>

        <form onSubmit={handleSendRequest} className="space-y-5 text-xs">
          {/* Optional Order Reference Selection */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Order Number (optional)</Label>
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger className="rounded-2xl text-xs font-semibold h-11 border-slate-200 bg-slate-50/50">
                <SelectValue placeholder="Select an order (optional)" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="none">None / General Enquiry</SelectItem>
                {customerOrders.map((ord) => (
                  <SelectItem key={ord.id} value={ord.id}>
                    Order #{ord.order_number} ({gbp(Number(ord.total || 0))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Large Issue Textarea */}
          <div className="space-y-1.5">
            <Label className="font-bold text-slate-700">Tell us about your issue *</Label>
            <Textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your issue, order, delivery, payment or product..."
              className="rounded-2xl text-xs font-semibold border-slate-200 p-4 focus:ring-primary focus:border-primary leading-relaxed"
              required
            />
          </div>

          {/* Primary JSS Red Send Button */}
          <div className="pt-2 flex justify-center">
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-full font-black text-xs gap-2 px-8 py-3 h-12 shadow-md bg-primary hover:bg-primary/90 text-white w-full sm:w-auto min-w-[200px]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "Sending Request..." : "Send Request"}
            </Button>
          </div>
        </form>
      </div>

      {/* 3. REQUEST HISTORY MODAL DIALOG */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 sm:p-8 bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Request History
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              View your previously submitted support requests and response status.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4 space-y-3 text-xs">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground font-bold flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" /> Loading your request
                history...
              </div>
            ) : supportRequests.length === 0 ? (
              <div className="p-8 text-center space-y-2 rounded-2xl bg-slate-50 border border-slate-200/80">
                <MessageSquareText className="mx-auto h-8 w-8 text-slate-400" />
                <p className="font-bold text-foreground text-sm">No requests yet</p>
                <p className="text-xs text-muted-foreground">
                  Your support requests will appear here.
                </p>
              </div>
            ) : (
              supportRequests.map((req) => {
                const matchedOrder = req.order_id
                  ? customerOrders.find((o) => o.id === req.order_id)
                  : null;
                const isExpanded = expandedRequestId === req.id;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2"
                  >
                    <div
                      onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                      className="flex items-center justify-between cursor-pointer gap-2"
                    >
                      <div className="space-y-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-foreground text-xs truncate">
                            {typeof req.subject === "string" ? req.subject : "Support Request"}
                          </p>
                          {getStatusBadge(req.status)}
                          {matchedOrder && (
                            <Badge
                              variant="outline"
                              className="bg-white text-slate-700 border-slate-200 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Package className="h-3 w-3 text-slate-500" /> Order #
                              {matchedOrder.order_number}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Submitted{" "}
                          {new Date(req.created_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-full shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-2 text-xs">
                        <p className="text-slate-700 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60">
                          {typeof req.description === "string" ? req.description : ""}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold pt-1">
                          <span>
                            Status:{" "}
                            {req.status === "Open" ? "Pending Support Team Review" : req.status}
                          </span>
                          <span className="text-emerald-700 font-bold">Support Team</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
