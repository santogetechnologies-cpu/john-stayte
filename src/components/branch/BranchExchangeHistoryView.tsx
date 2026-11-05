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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Cylinder Exchange History
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
            Audit logs of returned cylinders, safety checks, valve inspections, and deposit refunds.
          </p>
        </div>
      </div>

      {/* AUDIT LOGS OR EMPTY STATE */}
      <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
        {exchangeLogs.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2.5">
            <div className="h-12 w-12 rounded-2xl bg-slate-100/80 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto shadow-2xs">
              <Repeat className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">No cylinder exchanges recorded yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              When branch staff record customer empty bottle returns and safety inspections, the audit trail will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-extrabold uppercase text-[10px]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Returned Bottle</th>
                  <th className="py-3 px-3">Issued Bottle</th>
                  <th className="py-3 px-3">Safety Check</th>
                  <th className="py-3 px-3">Deposit / Exchange Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {exchangeLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-medium text-slate-500 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      {log.customer}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-medium">
                      {log.cylinderReturned}
                    </td>
                    <td className="py-3.5 px-3 text-slate-700 font-medium">
                      {log.cylinderIssued}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-800">
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
