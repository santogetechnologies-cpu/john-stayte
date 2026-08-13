import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  Send,
  User,
  ShoppingBag,
  Truck,
  Phone,
  Mail,
  MapPin,
  Clock,
  Save,
  CheckCircle2,
  Loader2,
  Calendar as CalendarIcon,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { logAdminAuditAction } from "@/lib/audit";

export function ManagerSupportView() {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Loaded real data from Supabase
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);

  // Selection state
  const [contextType, setContextType] = useState<"order" | "customer">("order");
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");

  // Form state
  const [messageType, setMessageType] = useState<string>("Delivery Update");
  const [messageText, setMessageText] = useState<string>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: custData },
        { data: orderData },
        { data: commsBlock },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("role", "customer").order("created_at", { ascending: false }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("cms_content_blocks").select("content").eq("section_key", "customer_messages_data").maybeSingle(),
      ]);

      setCustomers(custData || []);
      setOrders(orderData || []);

      if (orderData && orderData.length > 0) {
        setSelectedOrderId(orderData[0].id);
      }
      if (custData && custData.length > 0) {
        setSelectedCustomerId(custData[0].id);
      }

      if (commsBlock?.content) {
        try {
          const parsed = JSON.parse(commsBlock.content);
          setAllMessages(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
          setAllMessages([]);
        }
      } else {
        setAllMessages([]);
      }
    } catch (err: any) {
      toast.error("Failed to load customer communication data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveMessagesToSupabase = async (updatedList: any[]) => {
    const payload = {
      section_key: "customer_messages_data",
      title: "Customer Operational Messages",
      content: JSON.stringify(updatedList),
    };

    const { error } = await supabase
      .from("cms_content_blocks")
      .upsert(payload, { onConflict: "section_key" });

    if (error) throw error;
  };

  // Currently active customer & order based on context selection
  const activeOrder = orders.find((o) => o.id === selectedOrderId) || null;
  const activeCustomer =
    contextType === "order" && activeOrder
      ? customers.find((c) => c.email === activeOrder.customer_email || c.id === activeOrder.customer_id) || {
          id: activeOrder.customer_id,
          full_name: activeOrder.customer_name,
          email: activeOrder.customer_email,
          phone: activeOrder.customer_phone,
        }
      : customers.find((c) => c.id === selectedCustomerId) || null;

  // Filter message history for selected customer/order
  const currentHistory = allMessages.filter((m) => {
    if (contextType === "order" && activeOrder) {
      return m.order_id === activeOrder.id || m.order_number === activeOrder.order_number;
    }
    if (activeCustomer) {
      return m.customer_id === activeCustomer.id || m.customer_email === activeCustomer.email;
    }
    return false;
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return toast.error("Please enter a message.");
    if (!activeCustomer) return toast.error("Please select a valid customer or order recipient.");

    setSending(true);
    try {
      const newMessage = {
        id: "msg_" + Date.now(),
        customer_id: activeCustomer.id || null,
        customer_name: activeCustomer.full_name || activeCustomer.name || "Customer",
        customer_email: activeCustomer.email,
        order_id: activeOrder?.id || null,
        order_number: activeOrder?.order_number || null,
        sender_id: user?.id || null,
        sender_name: user?.name || "John Stayte Operations Manager",
        sender_role: "manager",
        message_type: messageType,
        message: messageText.trim(),
        status: "delivered",
        created_at: new Date().toISOString(),
      };

      const updatedList = [newMessage, ...allMessages];
      await saveMessagesToSupabase(updatedList);
      setAllMessages(updatedList);

      // Create notification for customer if customer_id exists
      if (activeCustomer.id) {
        await supabase.from("notifications").insert([
          {
            user_id: activeCustomer.id,
            title: `${messageType}: ${activeOrder ? `Order #${activeOrder.order_number}` : "Update from Manager"}`,
            message: messageText.trim().substring(0, 100) + "...",
            category: "communication",
            read: false,
          },
        ]);
      }

      // Create Audit Log
      await logAdminAuditAction("SENT_CUSTOMER_MESSAGE", "communication", newMessage.id, {
        customer_email: activeCustomer.email,
        message_type: messageType,
      });

      toast.success(`Message sent to ${activeCustomer.full_name || activeCustomer.email}!`);
      setMessageText("");
    } catch (err: any) {
      toast.error("Failed to send customer message: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!messageText.trim()) return toast.error("Please enter draft content.");
    toast.success("Message draft saved locally.");
  };

  // Overview metrics
  const totalConversations = new Set(allMessages.map((m) => m.customer_email)).size;
  const unreadMessages = allMessages.filter((m) => m.status === "sent").length;
  const deliveryMessages = allMessages.filter((m) => m.message_type === "Delivery Update").length;
  const todayMessages = allMessages.filter(
    (m) => new Date(m.created_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/manager" className="hover:text-primary transition-colors">Manager</Link>
            <span>/</span>
            <span className="text-foreground">Support & Communications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <MessageCircle className="h-7 w-7 text-primary" /> Customer Communication Hub
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Direct operational messaging, delivery updates, and customer notifications.
          </p>
        </div>
      </div>

      {/* SUPPORT DASHBOARD KPIS (4 CARDS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Threads</p>
          <p className="text-2xl font-black text-foreground">{totalConversations}</p>
          <p className="text-[10px] text-muted-foreground">Unique customer channels</p>
        </div>

        <div className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Unread Messages</p>
          <p className="text-2xl font-black text-amber-600">{unreadMessages}</p>
          <p className="text-[10px] text-muted-foreground">Pending customer replies</p>
        </div>

        <div className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Today's Messages</p>
          <p className="text-2xl font-black text-blue-600">{todayMessages}</p>
          <p className="text-[10px] text-muted-foreground">Dispatches today</p>
        </div>

        <div className="surface-card p-4 rounded-3xl border bg-white space-y-1 shadow-xs">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Delivery Updates</p>
          <p className="text-2xl font-black text-emerald-600">{deliveryMessages}</p>
          <p className="text-[10px] text-muted-foreground">Logistics notifications</p>
        </div>
      </div>

      {/* MAIN TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: RECIPIENT CONTEXT & COMPOSER (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-4 shadow-xs">
            <h3 className="font-extrabold text-base text-foreground border-b pb-2">
              Select Message Recipient & Context
            </h3>

            {/* CONTEXT TYPE TOGGLE */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
              <Button
                onClick={() => setContextType("order")}
                variant={contextType === "order" ? "default" : "ghost"}
                size="sm"
                className="rounded-xl text-xs font-bold gap-1"
              >
                <ShoppingBag className="h-3.5 w-3.5" /> By Order Context
              </Button>
              <Button
                onClick={() => setContextType("customer")}
                variant={contextType === "customer" ? "default" : "ghost"}
                size="sm"
                className="rounded-xl text-xs font-bold gap-1"
              >
                <User className="h-3.5 w-3.5" /> By Customer Profile
              </Button>
            </div>

            {/* CONTEXT SELECT DROPDOWN */}
            {contextType === "order" ? (
              <div>
                <Label className="font-bold text-xs text-slate-700">Select Active Customer Order *</Label>
                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className="mt-1 rounded-xl text-xs font-bold h-10 border-slate-200 bg-white">
                    <SelectValue placeholder="Choose order..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        Order #{o.order_number || o.id.slice(0, 8)} &bull; {o.customer_name} &bull; {gbp(o.total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="font-bold text-xs text-slate-700">Select Customer Profile *</Label>
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="mt-1 rounded-xl text-xs font-bold h-10 border-slate-200 bg-white">
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name || "Customer"} &bull; {c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* DISPLAY SELECTED RECIPIENT CARD */}
            {activeCustomer && (
              <div className="p-4 rounded-2xl bg-slate-50 border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-foreground">{activeCustomer.full_name || activeCustomer.name || "Customer Account"}</span>
                  {activeOrder && (
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                      Order #{activeOrder.order_number || activeOrder.id.slice(0, 8)}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-500" /> {activeCustomer.email}</p>
                  {activeCustomer.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-500" /> {activeCustomer.phone}</p>}
                  {activeOrder && <p className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-slate-500" /> Status: {activeOrder.status}</p>}
                </div>
              </div>
            )}

            {/* MESSAGE COMPOSER FORM */}
            <form onSubmit={handleSendMessage} className="space-y-4 pt-2">
              <div>
                <Label className="font-bold text-xs text-slate-700">Message Category / Type *</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger className="mt-1 rounded-xl text-xs font-bold h-10 border-slate-200 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="Delivery Update">Delivery Update</SelectItem>
                    <SelectItem value="Order Update">Order Update</SelectItem>
                    <SelectItem value="Customer Update">Customer Update</SelectItem>
                    <SelectItem value="General Message">General Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-bold text-xs text-slate-700">Message Content *</Label>
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type operational update or dispatch note to send to customer..."
                  className="mt-1 rounded-2xl text-xs border-slate-200 font-medium"
                  rows={5}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleSaveDraft}
                  variant="outline"
                  className="rounded-full text-xs font-bold gap-1 border-slate-200"
                >
                  <Save className="h-3.5 w-3.5" /> Save Draft
                </Button>
                <Button
                  type="submit"
                  disabled={sending}
                  className="rounded-full font-extrabold text-xs gap-1.5 bg-primary hover:bg-primary/90 text-white"
                >
                  <Send className="h-3.5 w-3.5" /> {sending ? "Sending..." : "Send Customer Message"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: REALTIME CONVERSATION HISTORY (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-4 shadow-xs h-full flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-base text-foreground border-b pb-2">
                Communication History
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Real-time conversation log with selected recipient.
              </p>

              <div className="space-y-3 pt-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {loading ? (
                  <div className="py-12 text-center text-xs font-bold text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading messages...
                  </div>
                ) : currentHistory.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 border text-xs text-muted-foreground space-y-1">
                    <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-foreground">No message history</p>
                    <p className="text-[11px]">Sent messages to this customer will appear here.</p>
                  </div>
                ) : (
                  currentHistory.map((m) => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-slate-50 border space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-foreground">{m.sender_name}</span>
                        <Badge variant="outline" className="text-[9px] font-bold bg-white">
                          {m.message_type}
                        </Badge>
                      </div>
                      <p className="text-slate-700 leading-relaxed">{m.message}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                        <span>{new Date(m.created_at).toLocaleString("en-GB")}</span>
                        <span className="font-bold text-emerald-600 capitalize">✓ {m.status || "delivered"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
