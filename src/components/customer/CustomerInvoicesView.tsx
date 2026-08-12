import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerInvoicesView() {
  const { user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const currentEmail = authUser?.user?.email || user?.email;

        if (!currentEmail && !authUser?.user?.id) return;

        const { data } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .or(`customer_email.eq.${currentEmail},customer_id.eq.${authUser?.user?.id}`)
          .order("created_at", { ascending: false });

        if (data) {
          setOrders(data);
        }
      } catch (err) {
        console.error("Invoices load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, [user]);

  const handleDownloadVATInvoice = (order: any) => {
    toast.success(`VAT Invoice #${order.order_number} generated`);
    const invoiceContent = `
=====================================================
JOHN STAYTE SERVICES — VAT TAX INVOICE
=====================================================
Invoice Date: ${new Date(order.created_at).toLocaleDateString("en-GB")}
Order Reference: #${order.order_number}
Customer Email: ${order.customer_email || user?.email}
Delivery Address: ${typeof order.delivery_address === 'string' ? order.delivery_address : JSON.stringify(order.delivery_address)}

-----------------------------------------------------
ITEMS:
${(order.order_items || []).map((i: any) => `- ${i.product_name} x ${i.quantity} @ £${i.unit_price} = £${i.total_price}`).join("\n")}

-----------------------------------------------------
Subtotal: £${order.subtotal || order.total}
VAT (20%): £${((order.total || 0) * 0.2).toFixed(2)}
Total Amount Paid: £${order.total}
Payment Status: ${order.payment_status || "Paid"}
=====================================================
Thank you for trading with John Stayte Services!
    `.trim();

    const blob = new Blob([invoiceContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Invoice_${order.order_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
          <span>/</span>
          <span className="text-foreground font-bold">Invoices</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          VAT Invoices
        </h1>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs font-bold text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin mb-2" />
          Loading invoices from Supabase orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="surface-card p-12 sm:p-16 text-center rounded-3xl border bg-white space-y-4 shadow-xs">
          <div className="p-4 rounded-full bg-slate-100 text-slate-500 w-fit mx-auto">
            <Download className="h-10 w-10" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h2 className="font-black text-lg text-foreground">No invoices yet</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your VAT tax invoices will appear here automatically after you place an order.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="surface-card p-5 rounded-3xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm text-foreground">Invoice #{order.order_number}</p>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                      {order.payment_status === "paid" ? "Paid" : "Invoice Ready"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Order Date: {new Date(order.created_at).toLocaleDateString("en-GB")} • Total: {gbp(Number(order.total || 0))}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleDownloadVATInvoice(order)}
                size="sm"
                className="rounded-full text-xs font-bold gap-1.5 shadow-xs shrink-0 self-start sm:self-center"
              >
                <Download className="h-4 w-4" /> Download VAT Invoice
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
