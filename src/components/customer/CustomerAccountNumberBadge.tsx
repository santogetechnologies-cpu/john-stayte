import React from "react";
import { Hash, Copy, Check, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/image-5.png";

interface CustomerAccountNumberBadgeProps {
  accountNumber?: string | null;
  variant?: "hero" | "card" | "compact" | "table" | "invoice";
  showCopy?: boolean;
  className?: string;
  sublabel?: string;
}

/**
 * Official John Stayte Customer Account Number Display Badge.
 * Recreated to exactly match John Stayte visual reference design:
 * - Wide horizontal card with rounded corners, thin red border, subtle shadow
 * - Left vertical red gradient panel with white "JS" logo and angled divider
 * - Middle: "JOHN STAYTE ACCOUNT NUMBER", bold dark navy account number, green VERIFIED badge
 * - Right: Thin vertical divider, description, and red outlined Copy pill button
 */
export function CustomerAccountNumberBadge({
  accountNumber,
  variant = "card",
  showCopy = true,
  className,
  sublabel,
}: CustomerAccountNumberBadgeProps) {
  const [copied, setCopied] = React.useState(false);

  if (!accountNumber) return null;

  const cleanNumber = accountNumber.trim().toUpperCase();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(cleanNumber);
    setCopied(true);
    toast.success(`Account number ${cleanNumber} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Table variant (compact row pill)
  if (variant === "table") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#e31b23] text-black font-mono font-black text-xs tracking-wider shadow-xs select-all",
          className
        )}
        title="John Stayte Customer Account Number"
      >
        <Hash className="h-3 w-3 stroke-[2.5] text-black" />
        {cleanNumber}
      </span>
    );
  }

  // 2. Compact variant (order headers, checkout summary, card badges)
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#e31b23] text-black shadow-xs border border-red-700/20 select-all",
          className
        )}
        title="Permanent John Stayte Account Number"
      >
        <div className="flex flex-col">
          <span className="text-[9px] font-black uppercase tracking-wider text-black/85 leading-none">
            John Stayte Account
          </span>
          <span className="text-xs sm:text-sm font-black font-mono tracking-widest text-black mt-0.5 leading-none">
            {cleanNumber}
          </span>
        </div>
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-md text-black/80 hover:text-black hover:bg-black/10 transition-colors ml-1"
            title="Copy Account Number"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-black stroke-[3]" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    );
  }

  // 3. Invoice variant (for order summaries and invoice documents)
  if (variant === "invoice") {
    return (
      <div
        className={cn(
          "px-3 py-1.5 rounded-lg bg-[#e31b23] text-black font-black text-xs inline-flex items-center gap-2 border border-red-700/30",
          className
        )}
      >
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-black/90">
          Account No:
        </span>
        <span className="font-mono text-sm tracking-widest text-black font-black">
          {cleanNumber}
        </span>
      </div>
    );
  }

  // 4. Hero / Card variant (Customer Dashboard & Customer Profile matching exact client screenshot)
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-red-300/80 bg-gradient-to-r from-white via-white to-rose-50/50 shadow-[0_4px_20px_rgba(227,27,35,0.05)] transition-all animate-in fade-in duration-300 flex items-center justify-between min-h-[74px] sm:min-h-[82px]",
        className
      )}
    >
      {/* LEFT SECTION: Red gradient panel with white JS logo and angled divider */}
      <div className="relative shrink-0 w-20 sm:w-28 md:w-32 self-stretch min-h-[74px] sm:min-h-[82px] overflow-hidden flex items-center justify-start pl-3 sm:pl-5">
        <svg
          viewBox="0 0 110 80"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <linearGradient id="jsBadgeRedGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e31b23" />
              <stop offset="100%" stopColor="#be1218" />
            </linearGradient>
          </defs>
          {/* Main Red panel with slanted right edge (leaning right at top, left at bottom: /) */}
          <polygon points="0,0 86,0 66,80 0,80" fill="url(#jsBadgeRedGrad)" />
          {/* Parallel Accent Red stripe */}
          <polygon points="96,0 101,0 81,80 76,80" fill="#e31b23" />
        </svg>

        {/* Original John Stayte Services (JS) Logo */}
        <img
          src={logo}
          alt="John Stayte Services"
          className="relative z-10 h-10 w-10 sm:h-12 sm:w-12 object-contain shrink-0 select-none pointer-events-none drop-shadow-xs rounded-lg"
          width={48}
          height={48}
        />
      </div>

      {/* MIDDLE SECTION: Account Label + Number + Green Verified Badge */}
      <div className="flex-1 min-w-0 px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col justify-center">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-800 leading-none">
          JOHN STAYTE ACCOUNT NUMBER
        </span>
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3.5 mt-1 sm:mt-1.5">
          <span className="text-2xl sm:text-3xl md:text-[34px] font-black tracking-tight text-[#0a1128] font-display leading-none select-all">
            {cleanNumber}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#10b981] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider shadow-2xs">
            <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
            VERIFIED
          </span>
        </div>
      </div>

      {/* RIGHT SECTION: Divider + Description + Red Outlined Copy Button */}
      <div className="shrink-0 flex items-center gap-3 sm:gap-6 pr-3 sm:pr-6 py-2.5 sm:py-3">
        {/* Thin vertical red divider */}
        <div className="h-10 sm:h-12 w-[1px] bg-red-200/90 hidden md:block shrink-0" />

        {/* Permanent reference description */}
        <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-snug max-w-[210px] hidden md:block">
          {sublabel || "Your permanent customer reference for orders and invoices."}
        </p>

        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-red-500 hover:border-red-600 bg-white hover:bg-red-50/80 text-red-600 font-bold text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Copy Account Number"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 stroke-[2.5] text-red-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-red-600" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
