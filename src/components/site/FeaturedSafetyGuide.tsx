import { Link } from "@tanstack/react-router";
import { ShieldAlert, Clock, CalendarDays, CheckCircle2, ArrowRight } from "lucide-react";
import safetyGasHobImg from "@/assets/safety_gas_hob.jpg";
import safetyCoAlarmImg from "@/assets/safety_co_alarm.jpg";
import safetyGasValveImg from "@/assets/safety_gas_valve.jpg";

export function FeaturedSafetyGuide() {
  return (
    <section>
      <Link
        to="/blog/$slug"
        params={{ slug: "safe-cylinder-storage" }}
        className="group surface-card rounded-[28px] sm:rounded-[32px] border border-slate-200/90 bg-white overflow-hidden grid grid-cols-1 lg:grid-cols-12 hover:border-primary/40 hover:shadow-lg transition-all duration-300 shadow-xs cursor-pointer text-left block"
      >
        {/* Left Column (50% on desktop): 3-Image Safety Collage */}
        <div className="lg:col-span-6 flex flex-col gap-1.5 bg-slate-100/80 p-0 overflow-hidden">
          {/* Top Large Image: Modern Kitchen Gas Hob with Blue Flame */}
          <div className="w-full h-[220px] sm:h-[260px] lg:h-[270px] xl:h-[290px] overflow-hidden">
            <img
              src={safetyGasHobImg}
              alt="Modern UK domestic kitchen gas hob with safe blue flame"
              className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-500"
              loading="lazy"
            />
          </div>

          {/* Bottom Row: 2 Equal Square/Landscape Images */}
          <div className="grid grid-cols-2 gap-1.5 w-full h-[140px] sm:h-[170px] lg:h-[180px] xl:h-[190px]">
            {/* Bottom Left: Carbon Monoxide Alarm Detector */}
            <div className="w-full h-full overflow-hidden">
              <img
                src={safetyCoAlarmImg}
                alt="Digital carbon monoxide detector alarm mounted on UK home wall"
                className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-500"
                loading="lazy"
              />
            </div>

            {/* Bottom Right: Gas Appliance Shutoff Valve & Pipework */}
            <div className="w-full h-full overflow-hidden">
              <img
                src={safetyGasValveImg}
                alt="Professional brass gas isolation valve and appliance pipework"
                className="w-full h-full object-cover object-center group-hover:scale-[1.015] transition-transform duration-500"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Right Column (50% on desktop): Clean White Editorial Content */}
        <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-5 sm:space-y-6 bg-white text-left">
          <div className="space-y-4">
            {/* Eyebrow Label */}
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-primary font-display">
              <ShieldAlert className="h-4 w-4 text-primary" /> FEATURED SAFETY GUIDE
            </div>

            {/* Main Heading */}
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[38px] font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight leading-tight font-display">
              Gas Cylinder Safety Measures
            </h2>

            {/* Reading Time & Date */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-500" /> 4 min read
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <CalendarDays className="h-3.5 w-3.5 text-slate-500" /> 14 Jun 2026
              </span>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
              Simple, practical guidance for safer LPG storage, handling and everyday use across domestic and commercial settings.
            </p>

            {/* Two-Column Safety Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-2 text-xs sm:text-[13px] font-bold text-slate-800 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Safe storage
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Outdoor ventilation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Correct handling
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Leak awareness
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Child safety
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> Emergency steps
              </div>
            </div>
          </div>

          {/* Bottom Action Row */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="inline-flex items-center justify-center gap-2 rounded-full bg-primary hover:bg-primary/90 text-white px-7 py-3 text-xs sm:text-sm font-extrabold shadow-sm transition-all text-center font-display">
              <span>READ SAFETY GUIDE</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform stroke-[2.5]" />
            </span>
            <span className="text-xs sm:text-sm text-slate-400 font-semibold hidden sm:inline font-display">100% Free UK Guidance</span>
          </div>
        </div>
      </Link>
    </section>
  );
}
