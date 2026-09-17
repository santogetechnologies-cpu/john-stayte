import {
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Flame,
  ShieldCheck,
  FileText,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeliverySupportView() {
  return (
    <div className="space-y-5 sm:space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
          Depot Logistics & Driver Support
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Direct dispatch communications, LPG cylinder safety guidelines, and emergency depot
          hotlines.
        </p>
      </div>

      {/* Emergency & Direct Dispatch Contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-red-600 text-white rounded-3xl p-6 shadow-md shadow-red-600/10 space-y-4">
          <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-red-200">
              URGENT / EMERGENCY DISPATCH
            </span>
            <h2 className="text-xl font-display font-black tracking-tight mt-0.5">01452 740375</h2>
            <p className="text-xs text-red-100 font-medium mt-1 leading-relaxed">
              For on-road cylinder leaks, vehicle breakdowns, or emergency access blocks.
            </p>
          </div>
          <Button
            asChild
            className="rounded-full bg-white text-red-600 hover:bg-red-50 font-extrabold text-xs h-9 px-5 shadow-xs"
          >
            <a href="tel:01452740375">Call Emergency Dispatch</a>
          </Button>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="h-10 w-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              DEPOT OPERATIONS DESK
            </span>
            <h2 className="text-xl font-display font-black tracking-tight text-slate-900 mt-0.5">
              01452 740376
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Standard order modifications, customer rescheduling, and cylinder batch queries.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="rounded-full border-slate-200 text-slate-700 font-bold text-xs h-9 px-5 hover:bg-slate-50"
          >
            <a href="tel:01452740376">Contact Depot Desk</a>
          </Button>
        </div>
      </div>

      {/* Depot Location & Facilities */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-display font-extrabold text-slate-900">
          Main Depot & Filling Station Facilities
        </h2>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
          <div className="flex items-start gap-2 text-slate-700 font-semibold">
            <MapPin className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">John Stayte Services Main Logistics Depot</p>
              <p className="text-slate-600">
                Unit 4 Whitminster Industrial Estate, Whitminster, Gloucestershire, GL2 7PN
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Operating Hours: Monday – Friday: 07:30 - 17:30 · Saturday: 08:00 - 13:00
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Driver LPG Safety & Verification Protocols */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-display font-extrabold text-slate-900">
          LPG Cylinder Safety Checklist for Drivers
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Flame className="h-4 w-4 text-red-600" /> Upright Transport
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Always secure LPG cylinders in an upright vertical position with safety chains. Never
              transport horizontally.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Valve & Cap Inspection
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Inspect empty return cylinders for valve damage or missing protective safety caps
              before loading onto vehicle.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Customer Drop-off Zone
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Ensure cylinder base sits on level, non-combustible ground away from cellar grates,
              drains, or ignition sources.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl border border-slate-200/80 bg-white space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <FileText className="h-4 w-4 text-blue-600" /> Real-time Handover Log
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Submit empty returns and customer confirmation immediately via this portal to update
              live invoice records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
