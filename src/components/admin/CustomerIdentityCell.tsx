import React, { useState } from "react";
import { User, Copy, Check, Hash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CustomerIdentityProps {
  name?: string | null;
  customerId?: string | null;
  accountNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar?: boolean;
  layout?: "table" | "compact" | "detail" | "inline";
  className?: string;
}

/**
 * CustomerIdentityCell:
 * Standardized customer identification component for Admin & Manager portals.
 * Strictly separates:
 * 1. Customer Name
 * 2. Customer ID (UUID from database)
 * 3. John Stayte Account Number (permanent client identifier e.g. MABI01)
 */
export function CustomerIdentityCell({
  name,
  customerId,
  accountNumber,
  email,
  phone,
  avatar = false,
  layout = "table",
  className,
}: CustomerIdentityProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  const cleanName = (name || "").trim();
  const cleanId = (customerId || "").trim();
  const cleanAccount = (accountNumber || "").trim().toUpperCase();

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanId) return;
    navigator.clipboard.writeText(cleanId);
    setCopiedId(true);
    toast.success(`Customer ID ${cleanId} copied to clipboard!`);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyAccount = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!cleanAccount) return;
    navigator.clipboard.writeText(cleanAccount);
    setCopiedAccount(true);
    toast.success(`Account Number ${cleanAccount} copied to clipboard!`);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  // 1. INLINE LAYOUT (e.g. In dialog descriptions, titles, short summaries)
  if (layout === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-1.5 flex-wrap align-middle", className)}>
        <span className="font-extrabold text-slate-900">{cleanName || "Customer"}</span>
        {cleanId ? (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100/90 text-slate-700 border border-slate-200/80 font-mono text-[10px] cursor-pointer hover:bg-slate-200/70 transition-colors"
            onClick={handleCopyId}
            title={`Customer ID: ${cleanId} (click to copy)`}
          >
            <span className="text-[9px] text-slate-400 font-bold uppercase select-none">ID:</span>
            <span className="truncate max-w-[120px] select-all">{cleanId}</span>
            {copiedId ? (
              <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
            ) : (
              <Copy className="h-2.5 w-2.5 text-slate-400 opacity-60 shrink-0" />
            )}
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px] font-medium border border-slate-200/60 select-none">
            Guest
          </span>
        )}
        {cleanAccount && (
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-200/80 text-red-700 font-mono font-black text-[10px] cursor-pointer hover:bg-red-100/70 transition-colors"
            onClick={handleCopyAccount}
            title={`Account Number: ${cleanAccount} (click to copy)`}
          >
            <span className="text-[9px] text-red-500 font-bold uppercase select-none">ACCT:</span>
            <span className="select-all">{cleanAccount}</span>
            {copiedAccount ? (
              <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
            ) : (
              <Copy className="h-2.5 w-2.5 text-red-400 opacity-60 shrink-0" />
            )}
          </span>
        )}
      </span>
    );
  }

  // 2. DETAIL CARD LAYOUT (Order Details Sheets, Customer Modals, Applications review)
  if (layout === "detail") {
    return (
      <div className={cn("p-4 rounded-2xl border border-slate-200/90 bg-white/90 shadow-2xs space-y-3", className)}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-extrabold text-xs uppercase tracking-wider text-slate-900">
              Customer Details
            </span>
          </div>
          {cleanAccount && (
            <span
              onClick={handleCopyAccount}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 font-mono font-black text-[11px] cursor-pointer hover:bg-red-100/80 transition-colors"
              title="Click to copy Account Number"
            >
              <Hash className="h-3 w-3 text-red-600" />
              <span>{cleanAccount}</span>
              {copiedAccount ? (
                <Check className="h-3 w-3 text-emerald-600 ml-0.5" />
              ) : (
                <Copy className="h-3 w-3 text-red-400 opacity-70 ml-0.5" />
              )}
            </span>
          )}
        </div>

        <div className="space-y-2.5 text-xs">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Customer Name
            </span>
            <p className="text-sm font-black text-slate-900 mt-0.5">
              {cleanName || "Guest Customer"}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Customer ID
            </span>
            {cleanId ? (
              <div className="flex items-center gap-2 mt-0.5">
                <code className="font-mono text-xs text-slate-800 bg-slate-100/90 px-2 py-1 rounded-lg border border-slate-200/90 select-all break-all">
                  {cleanId}
                </code>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Copy Customer ID"
                >
                  {copiedId ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-medium italic mt-0.5">
                Unregistered / Guest Account
              </p>
            )}
          </div>

          {cleanAccount && (
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                John Stayte Account Number
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono font-black text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 select-all">
                  {cleanAccount}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                  title="Copy Account Number"
                >
                  {copiedAccount ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {email && (
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Email Address
              </span>
              <p className="text-xs text-slate-700 font-medium mt-0.5 select-all">{email}</p>
            </div>
          )}

          {phone && (
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Phone Number
              </span>
              <p className="text-xs text-slate-700 font-medium mt-0.5 select-all">{phone}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. TABLE LAYOUT (Default for Order Tables, Delivery Tables, Invoices, Customer lists)
  return (
    <div className={cn("flex items-start gap-2.5 min-w-0 text-left", className)}>
      {avatar && (
        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
          {(cleanName || "C").charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 space-y-1">
        <div className="font-extrabold text-xs text-slate-900 leading-tight truncate">
          {cleanName || "Customer"}
        </div>

        {/* Customer ID & Account Number */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {cleanId ? (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-slate-600 font-mono font-medium transition-colors cursor-pointer group"
              onClick={handleCopyId}
              title={`Customer ID: ${cleanId} (click to copy)`}
            >
              <span className="font-bold text-[9px] text-slate-400 uppercase tracking-tight select-none">
                ID:
              </span>
              <span className="truncate max-w-[110px] sm:max-w-[140px] select-all">
                {cleanId}
              </span>
              {copiedId ? (
                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="h-2.5 w-2.5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px] font-medium border border-slate-200/60 select-none">
              Guest
            </span>
          )}

          {cleanAccount && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-200/80 text-red-700 font-mono font-extrabold tracking-wider text-[10px] shadow-2xs cursor-pointer hover:bg-red-100/70 transition-colors group"
              onClick={handleCopyAccount}
              title={`Account Number: ${cleanAccount} (click to copy)`}
            >
              <span className="text-[9px] font-black text-red-500 uppercase select-none">
                ACCT:
              </span>
              <span className="select-all">{cleanAccount}</span>
              {copiedAccount ? (
                <Check className="h-2.5 w-2.5 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="h-2.5 w-2.5 text-red-400 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </span>
          )}
        </div>

        {phone && (
          <div className="text-[11px] text-slate-400 font-medium">
            {phone}
          </div>
        )}
      </div>
    </div>
  );
}

