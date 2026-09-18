import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function ManagerReportsView() {
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadManagerData() {
      setLoading(true);
      try {
        const [{ data: dbOrders }, { data: dbInv }] = await Promise.all([
          supabase.from("orders").select("*, order_items(*)"),
          supabase.from("inventory").select("*, products(*)"),
        ]);
        setOrders(dbOrders || []);
        setInventory(dbInv || []);
      } catch (err) {
        console.error("Manager reports data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadManagerData();
  }, []);

  const handleDownloadReport = (title: string) => {
    toast.success(`Generating manager report: ${title}`);
    let csvContent =
      "Report Title: " +
      title +
      "\nGenerated Date: " +
      new Date().toLocaleDateString("en-GB") +
      "\n\n";

    if (title.includes("Dispatch")) {
      csvContent += "Order Number,Customer Name,Status,Total (£),Date\n";
      orders.forEach((o) => {
        csvContent += `"${o.order_number || o.id}","${o.customer_name || ""}","${o.status}",${o.total},"${new Date(o.created_at).toLocaleDateString("en-GB")}"\n`;
      });
    } else if (title.includes("Inventory")) {
      csvContent += "Product Name,Current Stock,Reorder Threshold,Depot Location,Status\n";
      inventory.forEach((i) => {
        const status = i.current_stock < i.reorder_threshold ? "Reorder Needed" : "Stock Healthy";
        csvContent += `"${i.products?.name || "Product"}",${i.current_stock},${i.reorder_threshold},"${i.depot_location || "Whitminster"}","${status}"\n`;
      });
    } else {
      csvContent += "Metric,Value,Description\n";
      csvContent += `"Orders Handled",${orders.length},"Total assigned orders"\n`;
      csvContent += `"Stock Items",${inventory.length},"Tracked inventory items"\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
          <Link to="/manager" className="hover:text-red-600 transition-colors">
            Manager
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Reports</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-red-500/10 text-red-600 border border-red-500/20">
            <FileText className="h-6 w-6" />
          </div>
          Daily Operational Reports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Daily dispatch summaries, truck logs, and depot stock counts.
        </p>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center text-xs font-bold text-slate-500 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          <Loader2 className="mx-auto h-6 w-6 text-red-600 animate-spin mb-2" />
          Loading report datasets...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "Daily Dispatch Summary",
              desc: "Cylinder orders shipped, pending drops, and delivery completion rate.",
              date: "Today",
            },
            {
              title: "Depot Inventory Reorder Report",
              desc: "Current gas cylinder stock levels vs minimum reorder thresholds.",
              date: "Today",
            },
            {
              title: "Driver Log & On-Time Performance",
              desc: "Route completion stats for regional delivery drivers.",
              date: "This Week",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="surface-card rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl p-5 space-y-4 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1"
            >
              <div>
                <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600 border border-red-500/20 w-fit mb-3">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="font-black text-sm text-slate-900">{r.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{r.desc}</p>
              </div>
              <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold">{r.date}</span>
                <Button
                  onClick={() => handleDownloadReport(r.title)}
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs font-black gap-1.5 h-8 border-white/80 bg-white/80 backdrop-blur-md text-slate-700 hover:bg-white hover:text-red-600 shadow-2xs transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
