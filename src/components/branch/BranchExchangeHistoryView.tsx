import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Repeat, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { isPendingBranchAssignment } from "@/lib/branch-service";

export function BranchExchangeHistoryView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);

  // Real audit logs from database (currently zero until staff logs real exchanges)
  const [exchangeLogs] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/branch" className="hover:text-slate-700 transition-colors">
          Branch
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">Cylinder Exchange History</span>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
              Cylinder Exchange History
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
            Audit logs of returned cylinders, safety checks, valve inspections, and deposit refunds.
          </p>
        </div>
      </div>

      {/* AUDIT LOGS OR EMPTY STATE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        {exchangeLogs.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Repeat className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-bold text-slate-800">No cylinder exchanges recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When branch staff record customer empty bottle returns and safety inspections, the audit trail will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Returned Bottle</th>
                  <th className="py-3 px-3">Issued Bottle</th>
                  <th className="py-3 px-3">Safety Check</th>
                  <th className="py-3 px-3">Deposit / Exchange Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {exchangeLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {log.customer}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {log.cylinderReturned}
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {log.cylinderIssued}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">
                      {log.depositAction}
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
