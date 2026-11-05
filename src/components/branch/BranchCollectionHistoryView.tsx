import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { FileCheck2, ChevronRight, ShoppingBag, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import {
  fetchRealBranchOrders,
  isPendingBranchAssignment,
  type BranchOrderRecord,
} from "@/lib/branch-service";

export function BranchCollectionHistoryView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);

  const [history, setHistory] = useState<BranchOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      if (isPending) {
        setHistory([]);
        return;
      }
      const data = await fetchRealBranchOrders(assignedBranch, "completed", user?.assignedBranchId);
      setHistory(data);
    } catch (err) {
      console.error("Failed to load collection history:", err);
    } finally {
      setLoading(false);
    }
  }, [assignedBranch, isPending]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/branch" className="hover:text-slate-700 transition-colors">
          Branch
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">Collection History</span>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Branch Collection History
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border shadow-2xs ${
                isPending
                  ? "bg-[#FFF7E6] text-[#92400E] border-[#FDE68A]"
                  : "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPending ? "bg-[#D97706] animate-pulse" : "bg-emerald-500"
                }`}
              />
              📍 {assignedBranch}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Historical database records of completed Click &amp; Collect orders handed over at this location.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadHistory}
          className="h-9.5 rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs px-4"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* TABLE OR EMPTY STATE */}
      <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {history.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2.5">
            <div className="h-12 w-12 rounded-2xl bg-slate-100/80 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto shadow-2xs">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">No collection history yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Completed customer Click &amp; Collect orders for {assignedBranch} will appear here once handed over.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3">Order Code</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Products Handed Over</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Collection Date</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                      {item.orderNumber}
                    </td>
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-slate-900">{item.customerName}</p>
                      <p className="text-[10px] text-slate-400">{item.customerPhone}</p>
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-medium">
                      {item.itemsSummary}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      £{item.total.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 font-medium whitespace-nowrap">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "N/A"}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 font-black text-[10px] uppercase tracking-wider">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
