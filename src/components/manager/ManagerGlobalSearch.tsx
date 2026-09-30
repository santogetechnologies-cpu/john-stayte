import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  ShoppingBag,
  Users,
  HelpCircle,
  Truck,
  Package,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export function ManagerGlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [matchedOrders, setMatchedOrders] = useState<any[]>([]);
  const [matchedCustomers, setMatchedCustomers] = useState<any[]>([]);
  const [matchedEnquiries, setMatchedEnquiries] = useState<any[]>([]);
  const [matchedDeliveries, setMatchedDeliveries] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query.trim()) {
      setMatchedOrders([]);
      setMatchedCustomers([]);
      setMatchedEnquiries([]);
      setMatchedDeliveries([]);
      return;
    }

    const q = query.trim();
    let isCurrent = true;
    setLoading(true);

    async function fetchSearch() {
      try {
        const [{ data: ords }, { data: custs }, { data: tix }, { data: delivs }] =
          await Promise.all([
            supabase
              .from("orders")
              .select("id, order_number, customer_name, total, status")
              .ilike("order_number", `%${q}%`)
              .limit(5),
            supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("role", "customer")
              .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
              .limit(5),
            supabase
              .from("support_tickets")
              .select("id, ticket_number, subject, customer_name, status")
              .or(`ticket_number.ilike.%${q}%,subject.ilike.%${q}%,customer_name.ilike.%${q}%`)
              .limit(5),
            supabase
              .from("delivery_assignments")
              .select("id, driver_name, vehicle_reg, status")
              .or(`driver_name.ilike.%${q}%,vehicle_reg.ilike.%${q}%`)
              .limit(5),
          ]);

        if (isCurrent) {
          setMatchedOrders(ords || []);
          setMatchedCustomers(custs || []);
          setMatchedEnquiries(tix || []);
          setMatchedDeliveries(delivs || []);
        }
      } catch (err) {
        console.error("Manager Global Search DB Error:", err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    const timer = setTimeout(fetchSearch, 200);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query]);

  const handleSelect = (path: string) => {
    onOpenChange(false);
    setQuery("");
    navigate({ to: path as never });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0 overflow-hidden rounded-3xl border border-white/80 bg-white/95 backdrop-blur-2xl text-slate-900 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Global Manager Search</DialogTitle>
        </DialogHeader>
        <div className="flex items-center border-b border-slate-100/80 px-4 py-3.5 bg-slate-50/50">
          <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search live orders, customers, support tickets, deliveries..."
            className="h-9 border-0 bg-transparent px-0 text-sm font-semibold text-slate-900 shadow-none focus-visible:ring-0 placeholder:text-slate-400"
            autoFocus
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-red-600 ml-2" />
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200/80 px-2 py-0.5 text-[10px] font-black text-slate-500 shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6">
          {!query && (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Quick Operations Links
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "My Orders", href: "/manager/orders", icon: ShoppingBag },
                  { label: "Deliveries", href: "/manager/deliveries", icon: Truck },
                  { label: "Inventory", href: "/manager/inventory", icon: Package },
                  { label: "Enquiries", href: "/manager/enquiries", icon: HelpCircle },
                ].map((item) => (
                  <button
                    key={item.href}
                    onClick={() => handleSelect(item.href)}
                    className="flex items-center gap-2 p-2.5 rounded-2xl border border-slate-200/80 bg-white/70 hover:bg-white hover:border-red-500/40 text-left transition-all group shadow-2xs cursor-pointer"
                  >
                    <div className="p-1.5 rounded-xl bg-slate-100 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                      <item.icon className="h-4 w-4 text-slate-500 group-hover:text-red-600 transition-colors" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && (
            <div className="space-y-4">
              {/* ORDERS */}
              {matchedOrders.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="h-3.5 w-3.5 text-red-600" /> Orders (
                    {matchedOrders.length})
                  </p>
                  <div className="grid gap-1.5">
                    {matchedOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => handleSelect("/manager/orders")}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-red-500/30 text-left transition-all shadow-2xs cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            #{o.order_number || o.id.slice(0, 8)}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {o.customer_name} · £{Number(o.total).toFixed(2)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CUSTOMERS */}
              {matchedCustomers.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-red-600" /> Customers (
                    {matchedCustomers.length})
                  </p>
                  <div className="grid gap-1.5">
                    {matchedCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelect("/manager/customers")}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-red-500/30 text-left transition-all shadow-2xs cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">{c.full_name}</p>
                          <p className="text-[11px] text-slate-500 font-medium">{c.email}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ENQUIRIES */}
              {matchedEnquiries.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-red-600" /> Enquiries (
                    {matchedEnquiries.length})
                  </p>
                  <div className="grid gap-1.5">
                    {matchedEnquiries.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => handleSelect("/manager/enquiries")}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-red-500/30 text-left transition-all shadow-2xs cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            #{e.ticket_number} - {e.subject}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {e.customer_name} · {e.status}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DELIVERIES */}
              {matchedDeliveries.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-red-600" /> Deliveries (
                    {matchedDeliveries.length})
                  </p>
                  <div className="grid gap-1.5">
                    {matchedDeliveries.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => handleSelect("/manager/deliveries")}
                        className="w-full flex items-center justify-between p-2.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 hover:border-red-500/30 text-left transition-all shadow-2xs cursor-pointer"
                      >
                        <div>
                          <p className="text-xs font-black text-slate-900">
                            {d.driver_name} ({d.vehicle_reg})
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium">{d.status}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading &&
                matchedOrders.length === 0 &&
                matchedCustomers.length === 0 &&
                matchedEnquiries.length === 0 &&
                matchedDeliveries.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500 font-medium">
                    No database records found matching "{query}".
                  </div>
                )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
