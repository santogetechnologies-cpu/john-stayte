import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { HelpCircle, Plus, MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerSupportView() {
  const { user } = useStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const currentEmail = authUser?.user?.email || user?.email;

      if (!currentEmail && !authUser?.user?.id) return;

      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .or(`customer_email.eq.${currentEmail},customer_id.eq.${authUser?.user?.id}`)
        .order("created_at", { ascending: false });

      if (data) {
        setTickets(data);
      }
    } catch (err: any) {
      console.error("Support tickets load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;

    setSubmitting(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Not authenticated");

      const currentEmail = authUser.user.email || user?.email || "";

      const { error } = await supabase.from("support_tickets").insert([
        {
          ticket_number: `TKT-${Math.floor(Math.random() * 89999 + 10000)}`,
          customer_id: authUser.user.id,
          customer_email: currentEmail,
          customer_name: user?.name || "Customer",
          subject: subject.trim(),
          description: message.trim(),
          status: "Open",
          priority: "Medium",
        },
      ]);

      if (error) throw error;

      toast.success("Support ticket created successfully!");
      setOpen(false);
      setSubject("");
      setMessage("");
      await loadTickets();
    } catch (err: any) {
      toast.error("Failed to create ticket: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Help & Support</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Help & Support
          </h1>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full font-bold text-xs gap-1.5 shadow-xs">
              <Plus className="h-4 w-4" /> New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
            <DialogHeader>
              <DialogTitle className="font-black text-lg">Submit Support Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4 pt-2 text-xs">
              <div>
                <label className="font-bold text-muted-foreground">Subject *</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Delivery status question"
                  className="mt-1 rounded-xl text-xs font-semibold"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-muted-foreground">Message / Description *</label>
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry..."
                  className="mt-1 rounded-xl text-xs font-semibold"
                  required
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-full text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-full font-bold text-xs gap-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Submit Ticket
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs font-bold text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
          Loading support tickets from Supabase...
        </div>
      ) : tickets.length === 0 ? (
        <div className="surface-card p-12 sm:p-16 text-center rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="p-4 rounded-full bg-slate-100 text-slate-500 w-fit mx-auto">
            <HelpCircle className="h-10 w-10" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-black text-lg text-foreground">No support requests yet</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Submit a support ticket above and our Gloucester team will assist you shortly.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="surface-card p-5 rounded-3xl border bg-white space-y-2 shadow-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-foreground">#{t.ticket_number || "TKT"}</span>
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase ${t.status === "Open" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                    {t.status}
                  </Badge>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {new Date(t.created_at).toLocaleDateString("en-GB")}
                </span>
              </div>
              <h3 className="font-bold text-xs text-foreground">{t.subject}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
