import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  Layers,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import {
  fetchRealBranchStock,
  isPendingBranchAssignment,
  type RealBranchStockItem,
} from "@/lib/branch-service";
import { toast } from "sonner";

export function BranchStockView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);

  const [loading, setLoading] = useState(true);
  const [stockAvailable, setStockAvailable] = useState(false);
  const [stockItems, setStockItems] = useState<RealBranchStockItem[]>([]);

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchRealBranchStock(assignedBranch, user?.assignedBranchId);
      setStockAvailable(res.available);
      setStockItems(res.items);
    } catch (err) {
      console.error("Failed to fetch branch stock:", err);
      setStockAvailable(false);
      setStockItems([]);
    } finally {
      setLoading(false);
    }
  }, [assignedBranch]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/branch" className="hover:text-slate-700 transition-colors">
          Branch
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">Cylinder Stock Management</span>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Branch Cylinder Stock
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
            Real-time branch inventory matrix of full cylinders and reorder thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadStock}
            className="h-9.5 rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs px-4"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              toast.info("Restock transfer notification sent to Whitminster Logistics Depot.");
            }}
            className="h-9.5 rounded-full text-xs font-black bg-[#374151] hover:bg-[#1f2937] text-white gap-1.5 shadow-sm px-4"
          >
            <Truck className="h-4 w-4" />
            <span>Request Depot Restock</span>
          </Button>
        </div>
      </div>

      {/* STOCK MATRIX TABLE OR REQUIRED UNAVAILABLE EMPTY STATE */}
      <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {!stockAvailable || stockItems.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-100/80 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto shadow-2xs">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Branch inventory data is not available.</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Forecourt-level cylinder inventory tracking has not yet been configured in the database for {assignedBranch}. Currently, the central logistics inventory table records stock at the Whitminster depot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3">Cylinder Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Full Cylinders</th>
                  <th className="py-3 px-3">Reorder Threshold</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Depot Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {stockItems.map((item) => {
                  const isLow = item.status === "low_stock";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3 font-extrabold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 font-black text-sm text-slate-900">
                        {item.availableFull}
                      </td>
                      <td className="py-3.5 px-3 font-medium text-slate-500">
                        {item.minThreshold}
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-extrabold ${
                            isLow
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : item.status === "out_of_stock"
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {isLow ? "Low Stock Alert" : item.status === "out_of_stock" ? "Out of Stock" : "In Stock"}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-slate-600">
                        {item.depotLocation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
