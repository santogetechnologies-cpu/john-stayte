import React from "react";
import { Hash, Copy, Check, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import logo from "@/assets/image-5.png";

export interface CustomerAccountNumberBadgeProps {
  accountNumber?: string | null;
  variant?: "hero" | "card" | "compact" | "table" | "invoice" | "banner" | "order-pill" | "pill";
  showCopy?: boolean;
  className?: string;
  sublabel?: string;
  isVerified?: boolean;
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
  isVerified,
}: CustomerAccountNumberBadgeProps) {
  const [copied, setCopied] = React.useState(false);

  const cleanNumber = accountNumber?.trim() ? accountNumber.trim().toUpperCase() : null;

  if (!cleanNumber && variant !== "banner" && variant !== "card") return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanNumber) return;
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
        <span className="text-[#FFFFFF]">{cleanNumber}</span>
      </span>
    );
  }

  // 1.5 Order Card Pill variant (clean white pill with pink border matching My Orders reference design)
  if (variant === "order-pill" || variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-between w-[185px] h-[44px] px-3 py-1 rounded-full bg-white border border-[#fc9a97] shadow-[0_2px_8px_rgba(252,154,151,0.08)] shrink-0 select-all",
          className
        )}
        title="John Stayte Customer Account Number"
      >
        <div className="flex flex-col text-left min-w-0 pr-1 justify-center">
          <span className="text-[9px] font-bold uppercase tracking-tight text-[#495873] leading-none select-none truncate">
            JOHN STAYTE ACCOUNT NUMBER
          </span>
          <span className="text-[16px] font-black font-display tracking-tight text-[#16A34A] leading-none mt-0.5 select-all">
            {cleanNumber}
          </span>
        </div>
        {showCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded-full text-[#050d20] hover:bg-slate-100 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
            title="Copy Account Number"
            aria-label="Copy Account Number"
          >
            {copied ? (
              <Check className="h-[15px] w-[15px] stroke-[2.5] text-emerald-600" />
            ) : (
              <Copy className="h-[15px] w-[15px] stroke-[2.2] text-[#050d20]" />
            )}
          </button>
        )}
      </div>
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
          <span className="text-xs sm:text-sm font-black font-mono tracking-widest text-[#FFFFFF] mt-0.5 leading-none">
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
        <span className="font-mono text-sm tracking-widest text-[#FFFFFF] font-black">
          {cleanNumber}
        </span>
      </div>
    );
  }

  // 4. Shared Module Banner variant (Compact horizontal card displayed consistently across all Customer Portal modules)
  if (variant === "banner") {
    const isPending = !cleanNumber || isVerified === false;
    const displayValue = cleanNumber || "Pending Verification";

    return (
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-red-200/80 bg-gradient-to-r from-white via-white to-rose-50/40 shadow-[0_2px_12px_rgba(227,27,35,0.04)] transition-all flex items-center justify-between min-h-[54px] sm:min-h-[58px] px-3.5 sm:px-5 py-2.5 gap-3",
          className
        )}
      >
        {/* Left Section: Compact Red Badge with JS Logo */}
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="relative shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-[#e31b23] to-[#be1218] p-1.5 flex items-center justify-center shadow-xs">
            <img
              src={logo}
              alt="John Stayte Services"
              className="h-full w-full object-contain select-none pointer-events-none drop-shadow-2xs rounded-md"
            />
          </div>

          {/* Account Label, Number & Verified Status */}
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight">
              JOHN STAYTE ACCOUNT NUMBER
            </span>
            <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 mt-0.5 sm:mt-1">
              <span
                className={cn(
                  "font-black font-display tracking-tight leading-none select-all",
                  cleanNumber
                    ? "text-lg sm:text-xl text-[#0a1128]"
                    : "text-sm sm:text-base text-amber-700 italic"
                )}
              >
                {displayValue}
              </span>
              {isPending ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-2xs">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Pending Verification
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10b981] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-2xs">
                  <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.5]" />
                  VERIFIED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Optional Copy Button */}
        {showCopy && cleanNumber && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-red-500 hover:border-red-600 bg-white hover:bg-red-50/80 text-red-600 font-bold text-xs shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Copy Account Number"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5] text-red-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-red-600" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // 5. Hero / Card variant (Customer Dashboard, Customer Details side panel, & Profile)
  const isCardPending = !cleanNumber || isVerified === false;
  const cardDisplayValue = cleanNumber || "Pending Verification";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-red-300/80 bg-gradient-to-r from-white via-white to-rose-50/50 shadow-[0_4px_20px_rgba(227,27,35,0.05)] transition-all animate-in fade-in duration-300 flex items-center justify-between min-h-[76px] sm:min-h-[84px] gap-2 sm:gap-3",
        className
      )}
    >
      {/* LEFT SECTION: Red gradient panel with white JS logo and angled divider */}
      <div className="relative shrink-0 w-20 sm:w-24 md:w-28 self-stretch min-h-[76px] sm:min-h-[84px] overflow-hidden flex items-center justify-start pl-3 sm:pl-4">
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
          className="relative z-10 h-9 w-9 sm:h-11 sm:w-11 object-contain shrink-0 select-none pointer-events-none drop-shadow-xs rounded-lg"
          width={44}
          height={44}
        />
      </div>

      {/* MIDDLE SECTION: Account Label + Number + Green Verified Badge + Description */}
      <div className="flex-1 min-w-0 py-2.5 sm:py-3 pr-1 sm:pr-2 flex flex-col justify-center">
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-700 leading-none">
          JOHN STAYTE ACCOUNT NUMBER
        </span>

        <div className="flex items-center flex-wrap gap-2 sm:gap-2.5 my-1">
          <span
            className={cn(
              "font-black tracking-tight font-display leading-none select-all",
              cleanNumber
                ? "text-xl sm:text-2xl md:text-[26px] text-[#0a1128]"
                : "text-base sm:text-lg text-amber-700 italic"
            )}
          >
            {cardDisplayValue}
          </span>
          {isCardPending ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-2xs shrink-0">
              <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              Pending Verification
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10b981] text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-2xs shrink-0">
              <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.5]" />
              VERIFIED
            </span>
          )}
        </div>

        {/* Customer description cleanly positioned beneath account number */}
        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-snug line-clamp-2 max-w-[340px]">
          {sublabel || "Your permanent customer reference for orders and invoices."}
        </p>
      </div>

      {/* RIGHT SECTION: Red Outlined Copy Button (Fully visible with guaranteed right margin) */}
      {showCopy && cleanNumber && (
        <div className="shrink-0 pr-3 sm:pr-4 py-2.5 flex items-center justify-center">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-red-500 hover:border-red-600 bg-white hover:bg-red-50/80 text-red-600 font-bold text-xs shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Copy Account Number"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 stroke-[2.5] text-red-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-red-600" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
