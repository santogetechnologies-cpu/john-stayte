import { useState, useEffect, useCallback } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ShoppingBag,
  Search,
  Clock,
  PackageCheck,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  ChevronRight,
  User,
  RefreshCw,
  AlertTriangle,
  Repeat,
  Plus,
  Minus,
  ShieldCheck,
  KeyRound,
  Lock,
  Loader2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import {
  fetchRealBranchOrders,
  isPendingBranchAssignment,
  resolveBranchInfo,
  updateBranchOrderStatus,
  getCylinderExchangeDetails,
  type BranchOrderRecord,
} from "@/lib/branch-service";
import {
  getOrCreateDeliveryOtp,
  verifyDeliveryOtp,
  reissueDeliveryOtp,
} from "@/lib/delivery-agent-service";
import { maskPhoneNumber } from "@/lib/delivery-otp-server-fn";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_TABS = [
  { label: "All Orders", value: "all" },
  { label: "New", value: "new", icon: Clock },
  { label: "Preparing", value: "preparing", icon: PackageCheck },
  { label: "Ready for Collection", value: "ready", icon: CheckCircle2 },
  { label: "Awaiting Customer", value: "awaiting", icon: AlertCircle },
  { label: "On Hold", value: "on_hold", icon: PauseCircle },
  { label: "Completed", value: "completed", icon: CheckCircle2 },
];

export function BranchOrdersView() {
  const { user } = useStore();
  const assignedBranch = user?.assignedBranch || "Pending Confirmation";
  const isPending = isPendingBranchAssignment(assignedBranch);
  const branchInfo = resolveBranchInfo(assignedBranch, user?.assignedBranchId);

  const routerState = useRouterState();
  const currentSearchStr =
    typeof window !== "undefined" ? window.location.search : routerState.location.searchStr || "";
  const currentParams = new URLSearchParams(currentSearchStr);
  const activeStatusFromUrl = currentParams.get("status")?.toLowerCase() || "all";

  const [activeTab, setActiveTab] = useState(activeStatusFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<BranchOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Cylinder Exchange Handover Modal State
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [selectedHandoverOrder, setSelectedHandoverOrder] = useState<BranchOrderRecord | null>(null);
  const [returnedEmptiesCount, setReturnedEmptiesCount] = useState<number>(0);
  const [submittingHandover, setSubmittingHandover] = useState(false);

  // Customer OTP Verification State
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifiedAt, setOtpVerifiedAt] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [reissuingOtp, setReissuingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [smsStatus, setSmsStatus] = useState<{
    sent: boolean;
    maskedPhone?: string;
    error?: string;
  } | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);

  const startCooldown = useCallback((endsAtMs: number, orderId?: string) => {
    setCooldownEndsAt(endsAtMs);
    const sec = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
    setCountdown(sec);
    const targetId = orderId || selectedHandoverOrder?.id;
    if (targetId && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`jss_branch_otp_cooldown_${targetId}`, String(endsAtMs));
      } catch {}
    }
  }, [selectedHandoverOrder?.id]);

  // Live 60-second countdown synchronized with backend wall-clock cooldown
  useEffect(() => {
    if (!cooldownEndsAt) {
      setCountdown(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setCooldownEndsAt(null);
        if (selectedHandoverOrder?.id && typeof window !== "undefined") {
          try {
            sessionStorage.removeItem(`jss_branch_otp_cooldown_${selectedHandoverOrder.id}`);
          } catch {}
        }
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [cooldownEndsAt, selectedHandoverOrder?.id]);

  useEffect(() => {
    setActiveTab(activeStatusFromUrl);
  }, [activeStatusFromUrl]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      if (isPending) {
        setOrders([]);
        return;
      }
      const data = await fetchRealBranchOrders(assignedBranch, activeTab, user?.assignedBranchId);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load real branch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [assignedBranch, activeTab, isPending]);

  useEffect(() => {
    loadOrders();

    if (!isPending) {
      const channel = supabase
        .channel("branch_orders_realtime_sync")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            loadOrders();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadOrders, isPending]);

  const triggerSendOtp = async (ord: BranchOrderRecord, isResend = false) => {
    // Prevent multiple simultaneous resend requests
    if (isResend) {
      if (reissuingOtp || sendingOtp || countdown > 0) return;
      setReissuingOtp(true);
    } else {
      if (sendingOtp) return;
      setSendingOtp(true);
    }
    setOtpError(null);

    try {
      const res = isResend
        ? await reissueDeliveryOtp(
            ord.id,
            ord.id,
            ord.customerPhone,
            ord.customerName,
          )
        : await getOrCreateDeliveryOtp(
            ord.id,
            ord.id,
            ord.customerPhone,
            ord.customerName,
          );

      if ("isVerified" in res && res.isVerified) {
        setOtpVerified(true);
        setOtpVerifiedAt(new Date().toISOString());
        setSmsStatus({
          sent: true,
          maskedPhone: res.maskedPhone || maskPhoneNumber(ord.customerPhone),
        });
        toast.success("Customer OTP has already been authenticated for this order.");
        return;
      }

      const isSuccessful = "success" in res ? Boolean(res.success) : Boolean(res.otpExists);

      // Synchronize live frontend countdown with backend cooldown
      if (res.cooldownEndsAt && res.cooldownEndsAt > Date.now()) {
        startCooldown(res.cooldownEndsAt, ord.id);
      } else if (res.cooldownRemainingSec && res.cooldownRemainingSec > 0) {
        startCooldown(Date.now() + res.cooldownRemainingSec * 1000, ord.id);
      } else if (isSuccessful) {
        // Immediate 60-second cooldown after sending OTP
        startCooldown(Date.now() + 60 * 1000, ord.id);
      }

      setSmsStatus({
        sent: Boolean(res.smsSent),
        maskedPhone: res.maskedPhone || maskPhoneNumber(ord.customerPhone),
        error: res.smsError || res.error,
      });

      if (res.smsSent) {
        toast.success(
          isResend
            ? `New verification code sent to customer (${res.maskedPhone || maskPhoneNumber(ord.customerPhone)}).`
            : `Verification code sent to customer (${res.maskedPhone || maskPhoneNumber(ord.customerPhone)}).`,
        );
      } else if (!isSuccessful && res.error) {
        // Server returned rate limit error
        toast.warning(res.error);
      } else if (res.smsError || res.error) {
        toast.warning(`OTP generated, but SMS delivery failed: ${res.smsError || res.error}`);
      }
    } catch (err: any) {
      console.error("Failed to dispatch OTP:", err);
      const msg = err?.message || "Failed to dispatch verification code.";
      const match = msg.match(/wait\s*(\d+)s/i);
      if (match && match[1]) {
        const remaining = Number(match[1]);
        startCooldown(Date.now() + remaining * 1000, ord.id);
        toast.warning(`Please wait ${remaining}s before requesting another SMS OTP.`);
      } else {
        setOtpError(msg);
        toast.error(msg);
      }
    } finally {
      setSendingOtp(false);
      setReissuingOtp(false);
    }
  };

  const handleOpenHandover = (ord: BranchOrderRecord) => {
    const exchange = getCylinderExchangeDetails(ord);
    setSelectedHandoverOrder(ord);
    setReturnedEmptiesCount(exchange.expectedEmptyQuantity);
    setOtpInput("");
    setOtpVerified(false);
    setOtpVerifiedAt(null);
    setOtpError(null);
    setSmsStatus({
      sent: false,
      maskedPhone: maskPhoneNumber(ord.customerPhone),
    });

    // Check if there is an active persisted cooldown for this order in sessionStorage
    let existingCooldown: number | null = null;
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(`jss_branch_otp_cooldown_${ord.id}`);
        if (stored) {
          const val = Number(stored);
          if (val > Date.now()) {
            existingCooldown = val;
            setCooldownEndsAt(val);
            setCountdown(Math.max(0, Math.ceil((val - Date.now()) / 1000)));
          } else {
            sessionStorage.removeItem(`jss_branch_otp_cooldown_${ord.id}`);
          }
        }
      } catch {}
    }

    if (!existingCooldown) {
      setCooldownEndsAt(null);
      setCountdown(0);
    }

    setHandoverModalOpen(true);

    // Automatically trigger OTP dispatch / sync backend status
    triggerSendOtp(ord, false);
  };

  const handleVerifyOtp = async () => {
    if (!selectedHandoverOrder) return;
    const cleanCode = otpInput.trim();
    if (cleanCode.length !== 6) {
      setOtpError("Please enter the complete 6-digit numeric OTP code.");
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await verifyDeliveryOtp(
        selectedHandoverOrder.id,
        cleanCode,
        selectedHandoverOrder.id,
      );

      if (!res.success) {
        setOtpError(res.error || "Incorrect OTP. Please check the 6-digit code with the customer.");
        toast.error(res.error || "Invalid OTP");
        return;
      }

      setOtpVerified(true);
      setOtpVerifiedAt(res.verifiedAt || new Date().toISOString());
      toast.success("Customer OTP verified successfully!");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      setOtpError(err?.message || "Verification failed. Please retry.");
      toast.error(err?.message || "Verification failed.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (!selectedHandoverOrder) return;

    if (!otpVerified) {
      setOtpError("Customer OTP must be verified before completing handover.");
      toast.error("Customer OTP verification is required before completing handover.");
      return;
    }

    setSubmittingHandover(true);

    try {
      const exchange = getCylinderExchangeDetails(selectedHandoverOrder);
      const isShort = returnedEmptiesCount < exchange.expectedEmptyQuantity;
      const handoverNote = exchange.isExchange
        ? `Collected at ${assignedBranch} on ${new Date().toLocaleDateString()}. [Exchange Verified: ${returnedEmptiesCount}/${exchange.expectedEmptyQuantity} Empties Returned${isShort ? " - SHORT RETURN" : " - FULL EXCHANGE"}] [Customer OTP Verified: Yes]`
        : `Collected at ${assignedBranch} on ${new Date().toLocaleDateString()}. [Customer OTP Verified: Yes]`;

      const res = await updateBranchOrderStatus({
        orderId: selectedHandoverOrder.id,
        status: "Delivered",
        fulfillmentStatus: "Completed",
        notes: handoverNote,
      });

      if (res.success) {
        toast.success(`Order ${selectedHandoverOrder.orderNumber} completed & handed over.`);
        setHandoverModalOpen(false);
        setSelectedHandoverOrder(null);
        setOtpInput("");
        setOtpVerified(false);
        loadOrders();
      } else {
        toast.error(res.error || `Could not complete order ${selectedHandoverOrder.orderNumber}.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete handover");
    } finally {
      setSubmittingHandover(false);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.itemsSummary.toLowerCase().includes(q) ||
      ord.customerPhone.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/branch" className="hover:text-slate-700 transition-colors">
          Branch
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">Click &amp; Collect Orders</span>
      </div>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Branch Orders
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
            Real database Click &amp; Collect orders assigned to this forecourt location.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            className="h-9.5 rounded-full text-xs font-bold gap-1.5 border-white/80 bg-white/70 backdrop-blur-md text-slate-700 hover:bg-white shadow-2xs cursor-pointer px-4"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* PENDING NOTICE */}
      {isPending && (
        <div className="surface-card p-4 sm:p-4.5 rounded-[20px] border border-[#FDE68A] bg-[#FFF7E6] backdrop-blur-md shadow-xs flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#D97706] shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <p className="font-extrabold text-[#92400E]">Awaiting Branch Assignment</p>
            <p className="text-[#92400E]/85 leading-relaxed text-[11px]">
              Staff account must be assigned to an active branch before order records can be accessed.
            </p>
          </div>
        </div>
      )}

      {/* STATUS TABS & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* STATUS TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <Link
                key={tab.value}
                to="/branch/orders"
                search={tab.value === "all" ? {} : { status: tab.value }}
                onClick={() => setActiveTab(tab.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 select-none ${
                  isActive
                    ? "bg-[#374151] text-white font-black shadow-sm"
                    : "border border-white/80 bg-white/70 backdrop-blur-md text-slate-600 hover:bg-white hover:text-slate-900 shadow-2xs"
                }`}
              >
                {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {/* SEARCH */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Order ID, customer, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9.5 h-9.5 rounded-full border-white/80 bg-white/70 backdrop-blur-md text-xs shadow-2xs focus-visible:ring-slate-400/30"
          />
        </div>
      </div>

      {/* ORDERS LIST */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-12 text-center space-y-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
            <div className="h-12 w-12 rounded-2xl bg-slate-100/80 text-slate-400 border border-slate-200/60 flex items-center justify-center mx-auto shadow-2xs">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">No orders yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              When customers place Click &amp; Collect orders assigned to this branch, they will appear here.
            </p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const s = (ord.status || "").toLowerCase();
            const exchange = getCylinderExchangeDetails(ord);

            const badgeColor =
              s === "ready"
                ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/20"
                : s === "approved" || s === "packed" || s === "preparing"
                  ? "bg-purple-500/10 text-purple-800 border-purple-500/20"
                  : s === "awaiting"
                    ? "bg-[#FFF7E6] text-[#92400E] border-[#FDE68A]"
                    : s === "on_hold"
                      ? "bg-rose-500/10 text-rose-800 border-rose-500/20"
                      : s === "delivered" || s === "completed"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-blue-500/10 text-blue-800 border-blue-500/20";

            return (
              <div
                key={ord.id}
                className="surface-card rounded-[22px] border border-white/80 bg-white/70 backdrop-blur-xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-xs hover:border-slate-300/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-sm text-slate-900">{ord.orderNumber}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${badgeColor}`}>
                      {ord.status.replace("_", " ")}
                    </span>

                    {/* Dedicated Cylinder Exchange Badge */}
                    {exchange.isExchange && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/10 text-amber-900 border border-amber-500/30 shadow-2xs">
                        <Repeat className="h-3 w-3 text-amber-600" />
                        <span>Exchange: {exchange.expectedEmptyQuantity} Empty Cylinder(s)</span>
                      </span>
                    )}

                    <span className="text-xs font-black text-slate-900 ml-auto md:ml-0">
                      £{ord.total.toFixed(2)}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 flex items-center gap-2 pt-0.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{ord.customerName}</span>
                    <span className="text-slate-300 font-normal">·</span>
                    <span className="text-slate-500 font-medium">{ord.customerPhone}</span>
                  </p>

                  <p className="text-xs text-slate-600 font-semibold">{ord.itemsSummary}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span>Slot: {ord.collectionSlot}</span>
                    </span>
                    {ord.notes && (
                      <span className="text-[#374151] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 rounded-md font-medium text-[11px]">
                        📌 {ord.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {(() => {
                    const statusLower = ord.status.toLowerCase();
                    if (statusLower === "delivered" || statusLower === "completed") {
                      return (
                        <span className="inline-block px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-600 font-extrabold border border-slate-200">
                          Completed
                        </span>
                      );
                    }
                    if (statusLower === "cancelled") {
                      return (
                        <span className="inline-block px-3 py-1 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200 font-extrabold">
                          Cancelled
                        </span>
                      );
                    }

                    if (statusLower === "pending" || statusLower === "new") {
                      return (
                        <Button
                          size="sm"
                          onClick={async () => {
                            const res = await updateBranchOrderStatus({
                              orderId: ord.id,
                              status: "Approved",
                              fulfillmentStatus: "Pending",
                            });
                            if (res.success) {
                              toast.success(`Order ${ord.orderNumber} approved.`);
                              loadOrders();
                            } else {
                              toast.error(res.error || `Could not approve order.`);
                            }
                          }}
                          className="rounded-full h-8 px-4 font-black text-xs cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                        >
                          Approve Order
                        </Button>
                      );
                    }

                    if (statusLower === "approved") {
                      return (
                        <Button
                          size="sm"
                          onClick={async () => {
                            const res = await updateBranchOrderStatus({
                              orderId: ord.id,
                              status: "Packed",
                              fulfillmentStatus: "Ready",
                            });
                            if (res.success) {
                              toast.success(`Order ${ord.orderNumber} marked packed.`);
                              loadOrders();
                            } else {
                              toast.error(res.error || `Could not update order.`);
                            }
                          }}
                          className="rounded-full h-8 px-4 font-black text-xs cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                        >
                          Mark Packed
                        </Button>
                      );
                    }

                    if (statusLower === "packed") {
                      return (
                        <Button
                          size="sm"
                          onClick={async () => {
                            const res = await updateBranchOrderStatus({
                              orderId: ord.id,
                              status: "Ready",
                              fulfillmentStatus: "Ready",
                            });
                            if (res.success) {
                              toast.success(`Order ${ord.orderNumber} is ready for collection!`);
                              loadOrders();
                            } else {
                              toast.error(res.error || `Could not update order.`);
                            }
                          }}
                          className="rounded-full h-8 px-4 font-black text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        >
                          Mark Ready
                        </Button>
                      );
                    }

                    if (statusLower === "ready") {
                      return (
                        <Button
                          size="sm"
                          onClick={() => handleOpenHandover(ord)}
                          className="rounded-full h-8 px-4 font-black text-xs cursor-pointer bg-[#374151] hover:bg-[#1f2937] text-white shadow-sm"
                        >
                          Handover Customer
                        </Button>
                      );
                    }

                    return null;
                  })()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CYLINDER EXCHANGE HANDOVER CHECKLIST & OTP VERIFICATION DIALOG */}
      <Dialog
        open={handoverModalOpen}
        onOpenChange={(open) => {
          if (!open && (verifyingOtp || submittingHandover)) return;
          setHandoverModalOpen(open);
          if (!open) {
            setSelectedHandoverOrder(null);
            setOtpInput("");
            setOtpVerified(false);
            setOtpError(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[24px] p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>Customer Handover &amp; Verification</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Verify customer identity via 6-digit OTP and confirm empty cylinder returns before completing handover.
            </DialogDescription>
          </DialogHeader>

          {selectedHandoverOrder && (() => {
            const exchange = getCylinderExchangeDetails(selectedHandoverOrder);
            const isShort = returnedEmptiesCount < exchange.expectedEmptyQuantity;

            return (
              <div className="space-y-4 py-2 text-xs">
                {/* ORDER INFO SUMMARY */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-extrabold text-slate-800">{selectedHandoverOrder.orderNumber}</span>
                    <span className="font-bold text-slate-900">£{selectedHandoverOrder.total.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-600 font-medium">
                    <span>
                      Customer: <strong className="text-slate-800">{selectedHandoverOrder.customerName}</strong>
                    </span>
                    <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px] self-start sm:self-auto">
                      <Lock className="h-3 w-3 text-slate-400" />
                      <span>{smsStatus?.maskedPhone || maskPhoneNumber(selectedHandoverOrder.customerPhone)}</span>
                    </div>
                  </div>
                  <p className="text-slate-600 font-medium">
                    Ordered Gas: <strong className="text-slate-800">{exchange.cylinderTypesSummary}</strong>
                  </p>
                </div>

                {/* CYLINDER EXCHANGE CHECKLIST */}
                {exchange.isExchange ? (
                  <div className="space-y-3 p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-amber-950 uppercase tracking-wide text-[11px]">Empty Cylinders to Return</p>
                        <p className="text-amber-800/80 text-[11px]">Expected empties based on refill items ordered</p>
                      </div>
                      <Badge variant="outline" className="font-mono font-black border-amber-300 bg-amber-100 text-amber-900">
                        Expected: {exchange.expectedEmptyQuantity}
                      </Badge>
                    </div>

                    {/* CONFIRM COUNTER */}
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Actual Empty Cylinders Received:
                      </label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={returnedEmptiesCount <= 0}
                          onClick={() => setReturnedEmptiesCount((c) => Math.max(0, c - 1))}
                          className="h-8 w-8 p-0 rounded-full cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="font-mono text-base font-black text-slate-900 w-8 text-center">
                          {returnedEmptiesCount}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={returnedEmptiesCount >= exchange.expectedEmptyQuantity}
                          onClick={() => setReturnedEmptiesCount((c) => Math.min(exchange.expectedEmptyQuantity, c + 1))}
                          className="h-8 w-8 p-0 rounded-full cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[11px] text-slate-500 font-medium">
                          of {exchange.expectedEmptyQuantity} expected
                        </span>
                      </div>
                    </div>

                    {/* WARNING OR CONFIRMATION NOTICE */}
                    {isShort ? (
                      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-[11px] text-rose-800">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-black">Short Return Warning:</strong> Customer returned {returnedEmptiesCount} of {exchange.expectedEmptyQuantity} expected cylinders. Standard non-return cylinder deposit charges (£39.99 each) will be logged on this order.
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2 text-[11px] text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-black">Full Exchange Verified:</strong> All {exchange.expectedEmptyQuantity} empty cylinders received and inspected.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                    This order does not include empty cylinder exchanges. Handover new cylinders directly to customer.
                  </div>
                )}

                {/* CUSTOMER OTP IDENTITY VERIFICATION SECTION */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="h-4 w-4 text-indigo-600" />
                      <span className="font-black text-slate-900 uppercase tracking-wide text-[11px]">
                        Customer OTP Verification
                      </span>
                    </div>
                    {otpVerified ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">
                        Verified ✓
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 font-extrabold text-[10px]">
                        OTP Required
                      </Badge>
                    )}
                  </div>

                  {otpVerified ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-emerald-900 font-black text-xs">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Customer Identity Successfully Authenticated</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Verification code validated {otpVerifiedAt ? `at ${new Date(otpVerifiedAt).toLocaleTimeString("en-GB")}` : "successfully"}. Handover is authorized.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Ask the customer for the 6-digit verification code sent to their registered mobile number{" "}
                        <strong className="font-mono text-slate-800">
                          ({smsStatus?.maskedPhone || maskPhoneNumber(selectedHandoverOrder.customerPhone)})
                        </strong>.
                      </p>

                      {/* SMS Status / Notice */}
                      {smsStatus?.sent && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>SMS verification code delivered to customer.</span>
                        </div>
                      )}

                      {smsStatus && !smsStatus.sent && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-bold">SMS Notice:</span>
                            <span className="block">{smsStatus.error || "SMS delivery pending or unavailable. Customer can view OTP in their account notifications."}</span>
                          </div>
                        </div>
                      )}

                      {/* 6-Digit InputOTP Control */}
                      <div className="flex justify-center py-1">
                        <InputOTP
                          maxLength={6}
                          value={otpInput}
                          onChange={(val) => {
                            setOtpInput(val);
                            if (otpError) setOtpError(null);
                          }}
                        >
                          <InputOTPGroup className="gap-2">
                            <InputOTPSlot index={0} className="h-11 w-10 text-lg font-mono font-black rounded-lg border-slate-200 bg-slate-50" />
                            <InputOTPSlot index={1} className="h-11 w-10 text-lg font-mono font-black rounded-lg border-slate-200 bg-slate-50" />
                            <InputOTPSlot index={2} className="h-11 w-10 text-lg font-mono font-black rounded-lg border-slate-200 bg-slate-50" />
                            <InputOTPSlot index={3} className="h-11 w-10 text-lg font-mono font-black rounded-lg border-slate-200 bg-slate-50" />
                            <InputOTPSlot index={4} className="h-11 w-10 text-lg font-mono font-black rounded-lg border-slate-200 bg-slate-50" />
                            <InputOTPSlot index={5} className="h-11 w-10 text-lg font-mono font-black rounded-lg border-slate-200 bg-slate-50" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      {otpError && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] text-rose-800 font-bold flex items-center justify-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{otpError}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={reissuingOtp || sendingOtp || countdown > 0}
                          onClick={() => triggerSendOtp(selectedHandoverOrder, true)}
                          className={cn(
                            "rounded-full text-xs font-bold h-8 px-3.5 border-slate-200 gap-1.5 transition-all select-none",
                            countdown > 0
                              ? "bg-slate-100/90 text-slate-400 border-slate-200 cursor-not-allowed hover:bg-slate-100/90 hover:text-slate-400"
                              : "text-slate-700 hover:bg-slate-50 cursor-pointer"
                          )}
                        >
                          <RefreshCw className={cn("h-3 w-3", (reissuingOtp || sendingOtp) && "animate-spin")} />
                          {reissuingOtp || sendingOtp
                            ? "Sending OTP..."
                            : countdown > 0
                              ? `Resend OTP in ${countdown}s`
                              : "Resend OTP"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={verifyingOtp || otpInput.trim().length !== 6}
                          onClick={handleVerifyOtp}
                          className="rounded-full text-xs font-bold h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                        >
                          {verifyingOtp ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          Verify OTP
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex flex-row justify-between items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 font-medium">
              {!otpVerified && "⚠️ Customer OTP verification required"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setHandoverModalOpen(false);
                  setSelectedHandoverOrder(null);
                  setOtpInput("");
                  setOtpVerified(false);
                  setOtpError(null);
                }}
                className="rounded-full text-xs font-bold px-4"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submittingHandover || !otpVerified}
                onClick={handleConfirmHandover}
                className={cn(
                  "rounded-full text-xs font-bold px-5 text-white transition-all",
                  otpVerified
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed hover:bg-slate-300"
                )}
              >
                {submittingHandover ? "Completing..." : "Confirm & Complete Handover"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
