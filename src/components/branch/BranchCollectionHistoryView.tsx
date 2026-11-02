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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
              Branch Collection History
            </h1>
            <Badge
              variant="outline"
              className={`font-bold text-xs ${
                isPending
                  ? "bg-amber-50 text-amber-800 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-300"
              }`}
            >
              📍 {assignedBranch}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Historical database records of completed Click &amp; Collect orders handed over at this location.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadHistory}
          className="rounded-xl text-xs font-bold gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* TABLE OR EMPTY STATE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {history.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <FileCheck2 className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No collection history yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Completed customer Click &amp; Collect orders for {assignedBranch} will appear here once handed over.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3">Order Code</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Products Handed Over</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Collection Date</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {item.orderNumber}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{item.customerName}</p>
                      <p className="text-[10px] text-slate-400">{item.customerPhone}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {item.itemsSummary}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      £{item.total.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "N/A"}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">
                        {item.status}
                      </Badge>
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
