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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
              Branch Cylinder Stock
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
            Real-time branch inventory matrix of full cylinders and reorder thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadStock}
            className="rounded-xl text-xs font-bold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              toast.info("Restock transfer notification sent to Whitminster Logistics Depot.");
            }}
            className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
          >
            <Truck className="h-4 w-4" />
            <span>Request Depot Restock</span>
          </Button>
        </div>
      </div>

      {/* STOCK MATRIX TABLE OR REQUIRED UNAVAILABLE EMPTY STATE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {!stockAvailable || stockItems.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-3">
            <Layers className="mx-auto h-9 w-9 text-slate-300" />
            <h3 className="text-base font-bold text-slate-900">Branch inventory data is not available.</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Forecourt-level cylinder inventory tracking has not yet been configured in the database for {assignedBranch}. Currently, the central logistics inventory table records stock at the Whitminster depot.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3">Cylinder Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Full Cylinders</th>
                  <th className="py-3 px-3">Reorder Threshold</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Depot Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockItems.map((item) => {
                  const isLow = item.status === "low_stock";
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
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
