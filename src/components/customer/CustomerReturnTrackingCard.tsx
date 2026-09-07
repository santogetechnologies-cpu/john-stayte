import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Calendar,
  User,
  Flame,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CylinderReturnRecord, parseReturnMetadata } from "@/lib/cylinder-returns-service";
import { cn } from "@/lib/utils";

interface CustomerReturnTrackingCardProps {
  returnRecord: CylinderReturnRecord;
  className?: string;
}

const RETURN_TIMELINE_STEPS = [
  { key: "Requested", label: "Requested" },
  { key: "Under Review", label: "Under Review" },
  { key: "Pickup Assigned", label: "Pickup Assigned" },
  { key: "Pickup Scheduled", label: "Pickup Scheduled" },
  { key: "Agent En Route", label: "Agent En Route" },
  { key: "Pickup Completed", label: "Pickup Completed" },
  { key: "Verified", label: "Verified" },
  { key: "Closed", label: "Closed" },
];

export function CustomerReturnTrackingCard({
  returnRecord,
  className,
}: CustomerReturnTrackingCardProps) {
  const meta = returnRecord.metadata || parseReturnMetadata(returnRecord);
  const rawStatus = returnRecord.status || "Requested";
  const isException =
    rawStatus === "Rejected" || rawStatus === "Pickup Failed" || rawStatus === "Issue Reported";

  // Normalize status into the 8 requested progression stages
  const getNormalizedStatus = (st: string) => {
    const s = st.toLowerCase();
    if (s === "requested") return "Requested";
    if (s === "under review" || s === "reviewing" || s === "approved") return "Under Review";
    if (s === "pickup assigned" || s === "agent assigned") return "Pickup Assigned";
    if (s === "pickup scheduled") return "Pickup Scheduled";
    if (
      s === "agent en route" ||
      s === "out for pickup" ||
      s === "in transit" ||
      s === "accepted" ||
      s === "arrived"
    )
      return "Agent En Route";
    if (s === "pickup completed" || s === "picked up" || s === "under verification")
      return "Pickup Completed";
    if (s === "verified") return "Verified";
    if (s === "closed" || s === "completed") return "Closed";
    return st;
  };

  const status = isException ? rawStatus : getNormalizedStatus(rawStatus);

  // Compute step index (0 to 7)
  const getStepIndex = (st: string) => {
    switch (st) {
      case "Requested":
        return 0;
      case "Under Review":
        return 1;
      case "Pickup Assigned":
        return 2;
      case "Pickup Scheduled":
        return 3;
      case "Agent En Route":
        return 4;
      case "Pickup Completed":
        return 5;
      case "Verified":
        return 6;
      case "Closed":
        return 7;
      default:
        return 0;
    }
  };

  const currentStepIdx = isException ? -1 : getStepIndex(status);

  // Status Badge Rendering
  const renderStatusBadge = () => {
    switch (status) {
      case "Requested":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-200 font-extrabold text-[11px] px-2.5 py-0.5"
          >
            <Clock className="h-3 w-3 mr-1" /> Requested
          </Badge>
        );
      case "Under Review":
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-800 border-amber-200 font-extrabold text-[11px] px-2.5 py-0.5"
          >
            <Clock className="h-3 w-3 mr-1" /> Under Review
          </Badge>
        );
      case "Pickup Assigned":
      case "Pickup Scheduled":
        return (
          <Badge
            variant="outline"
            className="bg-sky-50 text-sky-800 border-sky-200 font-extrabold text-[11px] px-2.5 py-0.5"
          >
            <Calendar className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
      case "Agent En Route":
        return (
          <Badge
            variant="outline"
            className="bg-indigo-50 text-indigo-800 border-indigo-200 font-extrabold text-[11px] px-2.5 py-0.5"
          >
            <Truck className="h-3 w-3 mr-1" /> Agent En Route
          </Badge>
        );
      case "Pickup Completed":
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-800 border-purple-200 font-extrabold text-[11px] px-2.5 py-0.5"
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Pickup Completed
          </Badge>
        );
      case "Verified":
      case "Closed":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold text-[11px] px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />{" "}
            {status === "Closed" ? "Closed / Completed" : "Verified"}
          </Badge>
        );
      case "Rejected":
      case "Pickup Failed":
      case "Issue Reported":
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-800 border-rose-200 font-extrabold text-[11px] px-2.5 py-0.5"
          >
            <AlertTriangle className="h-3 w-3 mr-1" /> {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-bold text-[11px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5",
        className,
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-50 text-red-600 shrink-0 border border-red-100">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-display font-extrabold text-slate-900 leading-tight">
                Cylinder Return Request
              </h2>
              <span className="font-mono text-xs font-black text-red-600">
                #{meta?.return_code || returnRecord.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Requested on{" "}
              {new Date(meta?.requested_at || returnRecord.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div>{renderStatusBadge()}</div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Cylinder Type
          </span>
          <p className="font-bold text-slate-900 leading-snug flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
            {meta?.cylinder_name || "LPG Gas Cylinder"}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Quantity & Reason
          </span>
          <p className="font-bold text-slate-900 leading-snug">
            <span className="text-red-600 font-black">{meta?.quantity || 1}x</span> &bull;{" "}
            {meta?.reason || "Empty Cylinder Return"}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Scheduled Pickup
          </span>
          <p className="font-bold text-slate-900 leading-snug">
            {meta?.scheduled_date ? (
              <span className="text-slate-900 font-semibold">
                {new Date(meta.scheduled_date).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                ({meta.time_slot || returnRecord.time_slot || "Morning"})
              </span>
            ) : (
              <span className="text-slate-500 font-normal italic">Pending depot schedule</span>
            )}
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Assigned Agent
          </span>
          <p className="font-bold text-slate-900 leading-snug flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            {meta?.assigned_agent_name ||
              (returnRecord.driver_name && !returnRecord.driver_name.includes("Unassigned")
                ? returnRecord.driver_name
                : "Awaiting assignment")}
          </p>
        </div>
      </div>

      {/* Exception Alert Banner if Issue / Rejected */}
      {isException && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-rose-900">
              {status === "Rejected"
                ? "Return Request Rejected"
                : "Pickup Issue / Exception Reported"}
            </p>
            <p className="text-rose-700 leading-relaxed">
              {meta?.rejection_reason ||
                meta?.exception_notes ||
                "Our team encountered an issue while processing this cylinder return pickup. Please contact customer support for assistance."}
            </p>
          </div>
        </div>
      )}

      {/* Return Verified / Completed Banner */}
      {(status === "Verified" || status === "Closed" || meta?.condition || meta?.collected_at) && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 text-xs space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span className="font-extrabold text-emerald-950">
                Doorstep Return Verification & Collection Complete
              </span>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">
              {status === "Closed" ? "Closed / Completed" : "Verified"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-200/60 text-[11px]">
            <div>
              <span className="text-emerald-700 font-semibold block">Pickup Date/Time:</span>
              <span className="font-bold text-slate-800">
                {meta?.collected_at || meta?.completed_at || meta?.verified_at
                  ? new Date(
                      meta.collected_at || meta.completed_at || meta.verified_at!,
                    ).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Completed"}
              </span>
            </div>

            <div>
              <span className="text-emerald-700 font-semibold block">Quantity Received:</span>
              <span className="font-bold text-slate-800">
                {meta?.received_quantity || meta?.quantity || 1} Cylinder
                {meta?.quantity && meta.quantity > 1 ? "s" : ""}
              </span>
            </div>

            <div>
              <span className="text-emerald-700 font-semibold block">Cylinder Condition:</span>
              <span className="font-black text-emerald-700">{meta?.condition || "Good"}</span>
            </div>

            <div>
              <span className="text-emerald-700 font-semibold block">Verified By:</span>
              <span className="font-bold text-slate-800">
                {meta?.verified_by || returnRecord.driver_name || "Delivery Agent"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modern Horizontal Timeline (Desktop/Tablet) */}
      {!isException && (
        <div className="space-y-2 pt-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Return Progression
          </span>

          {/* Desktop Timeline */}
          <div className="hidden sm:block relative pt-2 pb-1">
            <div className="absolute top-6 left-6 right-6 h-1 bg-slate-100 z-0" />
            <div
              className="absolute top-6 left-6 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 transition-all duration-500 z-0"
              style={{
                width: `${(Math.max(0, currentStepIdx) / (RETURN_TIMELINE_STEPS.length - 1)) * 90}%`,
              }}
            />

            <div className="grid grid-cols-8 relative z-10">
              {RETURN_TIMELINE_STEPS.map((stepItem, idx) => {
                const isDone = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div key={stepItem.key} className="flex flex-col items-center text-center px-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] transition-all ${
                        isCurrent
                          ? "bg-red-600 text-white ring-4 ring-red-100 shadow-sm scale-110"
                          : isDone
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-white text-slate-300 border border-slate-200"
                      }`}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </div>

                    <p
                      className={`text-[10px] mt-2 font-bold leading-tight line-clamp-2 ${
                        isCurrent ? "text-red-600" : isDone ? "text-slate-800" : "text-slate-400"
                      }`}
                    >
                      {stepItem.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Vertical Timeline */}
          <div className="sm:hidden space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-500 font-normal">Current Stage:</span>
              <span className="text-red-600 font-extrabold">
                {RETURN_TIMELINE_STEPS[currentStepIdx]?.label || status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
