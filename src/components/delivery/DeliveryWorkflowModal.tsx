import { useState, useEffect } from "react";
import {
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  Package,
  PackageCheck,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Flame,
  CheckSquare,
  Square,
  X,
  KeyRound,
  RefreshCw,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useStore, gbp } from "@/lib/store";
import {
  updateDeliveryWorkflowStep,
  UpdateWorkflowParams,
  getOrCreateDeliveryOtp,
  verifyDeliveryOtp,
  reissueDeliveryOtp,
} from "@/lib/delivery-agent-service";
import { getOrderCylinderExchangeRequirement } from "@/lib/cylinder-exchange-service";
import { cn } from "@/lib/utils";

interface DeliveryWorkflowModalProps {
  delivery: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onWorkflowComplete: () => void;
}

type WorkflowTab =
  | "overview"
  | "verify_customer"
  | "cylinder_handover"
  | "empty_return"
  | "otp_verification"
  | "final_confirmation"
  | "exception";

export function DeliveryWorkflowModal({
  delivery,
  open,
  onOpenChange,
  onWorkflowComplete,
}: DeliveryWorkflowModalProps) {
  const { user } = useStore();
  const [activeTab, setActiveTab] = useState<WorkflowTab>("overview");
  const [submitting, setSubmitting] = useState(false);

  // Handover Checklist state
  const [checkCustomer, setCheckCustomer] = useState(true);
  const [checkProduct, setCheckProduct] = useState(true);
  const [checkQuantity, setCheckQuantity] = useState(true);
  const [checkAddress, setCheckAddress] = useState(true);

  // Dynamic exchange requirement
  const exchangeReq = getOrderCylinderExchangeRequirement(delivery);

  // Empty cylinder verification state
  const [emptyReceived, setEmptyReceived] = useState<
    "received" | "no_cylinder" | "damaged" | "wrong" | "mismatch"
  >("received");
  const [cylinderCondition, setCylinderCondition] = useState<
    "Good" | "Damaged" | "Unsafe / Requires Inspection" | "Wrong Cylinder"
  >("Good");
  const [cylinderCount, setCylinderCount] = useState<number>(exchangeReq.expectedQuantity || 1);
  const [cylinderSerial, setCylinderSerial] = useState<string>("");
  const [emptyReturnNotes, setEmptyReturnNotes] = useState<string>("");
  const [emptyVerified, setEmptyVerified] = useState(false);

  // OTP verification state
  const [otpInput, setOtpInput] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifiedAt, setOtpVerifiedAt] = useState<string | null>(null);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [reissuingOtp, setReissuingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Exception reporting state
  const [exceptionType, setExceptionType] = useState("No Empty Cylinder");
  const [exceptionNotes, setExceptionNotes] = useState("");

  // Confirmation dialog for final delivery complete
  const [showFinalDialog, setShowFinalDialog] = useState(false);

  useEffect(() => {
    if (delivery) {
      const s = (delivery.status || "").toLowerCase();
      const notes = (delivery.notes || "");
      
      const isAlreadyOtpVerified = notes.includes('"verified":true') || s === "delivered" || s === "completed";
      setOtpVerified(isAlreadyOtpVerified);
      if (isAlreadyOtpVerified) {
        setOtpVerifiedAt(new Date().toISOString());
      } else {
        setOtpInput("");
        setOtpError(null);
      }

      setEmptyVerified(Boolean(notes && notes.includes("[Empty Return:")));
      setCylinderCount(exchangeReq.expectedQuantity || 1);

      // Automatically route to appropriate step based on current status
      if (s === "arrived") {
        setActiveTab("verify_customer");
      } else if (s === "customer verified") {
        setActiveTab("cylinder_handover");
      } else if (s === "cylinder handed over") {
        setActiveTab(exchangeReq.required ? "empty_return" : "otp_verification");
      } else if (s === "empty cylinder verified") {
        setActiveTab("otp_verification");
      } else {
        setActiveTab("overview");
      }

      // Initialize or retrieve delivery OTP in background
      getOrCreateDeliveryOtp(delivery.id, delivery.order_id || delivery.orders?.id);
    }
  }, [delivery, exchangeReq.required, exchangeReq.expectedQuantity]);

  if (!delivery) return null;

  const order = delivery.orders || {};
  const items = order.order_items || [];
  const status = delivery.status || "Assigned";
  const agentName = user?.name || delivery.driver_name || "Delivery Driver";

  // Parse delivery address
  let addressText = "Gloucestershire";
  if (order.delivery_address) {
    if (typeof order.delivery_address === "string") {
      addressText = order.delivery_address;
    } else {
      const a = order.delivery_address;
      addressText = [a.line1 || a.street, a.line2, a.city, a.postcode || a.postal_code]
        .filter(Boolean)
        .join(", ");
    }
  }

  // Handle Workflow Transitions
  const handleTransition = async (
    nextStatus: UpdateWorkflowParams["status"],
    extraPayload?: Partial<UpdateWorkflowParams>,
  ) => {
    setSubmitting(true);
    try {
      await updateDeliveryWorkflowStep({
        assignmentId: delivery.id,
        orderId: delivery.order_id || order.id,
        status: nextStatus,
        agentName,
        agentId: delivery.agent_id || user?.id,
        ...extraPayload,
      });

      toast.success(`Delivery status updated to ${nextStatus}`);
      onWorkflowComplete();
      if (nextStatus === "Delivered") {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update workflow");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Exception Report
  const handleReportException = async () => {
    if (!exceptionNotes.trim()) {
      toast.error("Please provide detailed notes for this issue.");
      return;
    }

    setSubmitting(true);
    try {
      await updateDeliveryWorkflowStep({
        assignmentId: delivery.id,
        orderId: delivery.order_id || order.id,
        status: "Exception",
        agentName,
        agentId: delivery.agent_id || user?.id,
        exceptionData: {
          issueType: exceptionType,
          notes: exceptionNotes.trim(),
        },
      });

      toast.success(`Exception reported: ${exceptionType}`);
      onWorkflowComplete();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to report issue");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Empty Cylinder Verification
  const handleVerifyEmpty = async () => {
    setSubmitting(true);
    try {
      const isReceived = emptyReceived === "received";
      
      // If "No Empty Cylinder" or other issue was selected, log exception
      if (!isReceived) {
        await updateDeliveryWorkflowStep({
          assignmentId: delivery.id,
          orderId: delivery.order_id || order.id,
          status: "Exception",
          agentName,
          agentId: delivery.agent_id || user?.id,
          emptyCylinderData: {
            received: false,
            condition: cylinderCondition,
            quantity: 0,
            notes: `Missing/Non-returned empty cylinder: ${emptyReceived}. Notes: ${emptyReturnNotes}`,
          },
          exceptionData: {
            issueType: emptyReceived === "no_cylinder" ? "No Empty Cylinder" : "Damaged / Wrong Cylinder",
            notes: `Customer was unable to provide required empty cylinder (${exchangeReq.expectedQuantity} expected). Outcome: ${emptyReceived}. ${emptyReturnNotes}`,
          },
        });
        setEmptyVerified(false);
        toast.warning("Delivery exception logged for missing empty cylinder.");
        setActiveTab("otp_verification");
        onWorkflowComplete();
        return;
      }

      await updateDeliveryWorkflowStep({
        assignmentId: delivery.id,
        orderId: delivery.order_id || order.id,
        status: "Empty Cylinder Verified",
        agentName,
        agentId: delivery.agent_id || user?.id,
        emptyCylinderData: {
          received: true,
          condition: cylinderCondition,
          quantity: cylinderCount,
          notes: `Serial: ${cylinderSerial || "N/A"} - ${emptyReturnNotes}`,
        },
      });

      setEmptyVerified(true);
      toast.success("Empty cylinder return verified!");
      setActiveTab("otp_verification");
      onWorkflowComplete();
    } catch (err: any) {
      toast.error(err.message || "Failed to verify empty cylinder");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Customer OTP Verification
  const handleVerifyOtp = async () => {
    if (otpInput.length !== 6) {
      setOtpError("Please enter the complete 6-digit OTP code.");
      return;
    }

    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const res = await verifyDeliveryOtp(
        delivery.id,
        otpInput,
        delivery.order_id || order.id,
      );

      if (!res.success) {
        setOtpError(res.error || "Incorrect OTP. Please check with customer.");
        toast.error(res.error || "Invalid OTP");
        return;
      }

      setOtpVerified(true);
      setOtpVerifiedAt(res.verifiedAt || new Date().toISOString());
      toast.success("Customer OTP verified successfully!");
      setActiveTab("final_confirmation");
      onWorkflowComplete();
    } catch (err: any) {
      setOtpError(err.message || "Failed to verify OTP.");
      toast.error(err.message || "Failed to verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Handle Reissuing / Resending OTP to Customer
  const handleResendOtp = async () => {
    setReissuingOtp(true);
    try {
      const res = await reissueDeliveryOtp(
        delivery.id,
        delivery.order_id || order.id,
      );
      toast.success(res.message || "New OTP sent to customer.");
      setOtpInput("");
      setOtpError(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to resend OTP");
    } finally {
      setReissuingOtp(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border border-white/80 shadow-2xl bg-white/95 backdrop-blur-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    "font-extrabold text-[10px] uppercase tracking-wider rounded-full px-2.5 py-0.5 shadow-2xs",
                    status === "Delivered"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : status === "Exception"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : status === "Out for Delivery"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-blue-50 text-blue-700 border-blue-200",
                  )}
                >
                  {status}
                </Badge>
                <span className="font-mono font-bold text-xs text-slate-500">
                  #{order.order_number || delivery.id.slice(0, 8)}
                </span>
              </div>
              <h2 className="font-display font-black text-base text-slate-900 truncate mt-0.5">
                {order.customer_name || "Customer Delivery"}
              </h2>
            </div>
          </div>
        </div>

        {/* Workflow Navigation Pills */}
        <div className="px-6 pt-3.5 pb-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-100 bg-slate-50/40">
          <Button
            size="sm"
            variant={activeTab === "overview" ? "default" : "ghost"}
            onClick={() => setActiveTab("overview")}
            className={cn(
              "rounded-full text-xs font-bold h-7 px-3 shrink-0 transition-all",
              activeTab === "overview"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
          >
            Overview
          </Button>
          <Button
            size="sm"
            variant={activeTab === "verify_customer" ? "default" : "ghost"}
            onClick={() => setActiveTab("verify_customer")}
            className={cn(
              "rounded-full text-xs font-bold h-7 px-3 shrink-0 transition-all",
              activeTab === "verify_customer"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
          >
            1. Verify Customer
          </Button>
          <Button
            size="sm"
            variant={activeTab === "cylinder_handover" ? "default" : "ghost"}
            onClick={() => setActiveTab("cylinder_handover")}
            className={cn(
              "rounded-full text-xs font-bold h-7 px-3 shrink-0 transition-all",
              activeTab === "cylinder_handover"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
          >
            2. Handover
          </Button>
          {exchangeReq.required && (
            <Button
              size="sm"
              variant={activeTab === "empty_return" ? "default" : "ghost"}
              onClick={() => setActiveTab("empty_return")}
              className={cn(
                "rounded-full text-xs font-bold h-7 px-3 shrink-0 transition-all",
                activeTab === "empty_return"
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
              )}
            >
              3. Empty Return
            </Button>
          )}
          <Button
            size="sm"
            variant={activeTab === "otp_verification" ? "default" : "ghost"}
            onClick={() => setActiveTab("otp_verification")}
            className={cn(
              "rounded-full text-xs font-bold h-7 px-3 shrink-0 transition-all",
              activeTab === "otp_verification"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs font-black"
                : otpVerified
                  ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
          >
            {exchangeReq.required ? "4. Customer OTP" : "3. Customer OTP"}
            {otpVerified && " ✓"}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "final_confirmation" ? "default" : "ghost"}
            onClick={() => setActiveTab("final_confirmation")}
            className={cn(
              "rounded-full text-xs font-bold h-7 px-3 shrink-0 transition-all",
              activeTab === "final_confirmation"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs font-black"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            )}
          >
            {exchangeReq.required ? "5. Confirm & Complete" : "4. Confirm & Complete"}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "exception" ? "destructive" : "ghost"}
            onClick={() => setActiveTab("exception")}
            className={cn(
              "rounded-full text-xs font-bold h-7 px-3 shrink-0 transition-all text-red-600 hover:bg-red-50",
              activeTab === "exception" && "bg-rose-600 text-white hover:bg-rose-700",
            )}
          >
            Report Issue
          </Button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              {/* Customer & Address Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    CUSTOMER DETAILS
                  </span>
                  {order.customer_phone && (
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="text-xs font-bold text-red-600 flex items-center gap-1 hover:underline"
                    >
                      <Phone className="h-3 w-3" /> {order.customer_phone}
                    </a>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-slate-900">{order.customer_name}</p>
                  <p className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{addressText}</span>
                  </p>
                </div>
              </div>

              {/* Order Items List */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  CYLINDERS / PRODUCTS FOR DELIVERY
                </span>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 overflow-hidden">
                  {items.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 font-medium">
                      LPG Propane Gas Cylinder 47kg x 1
                    </div>
                  ) : (
                    items.map((item: any) => (
                      <div
                        key={item.id || item.product_name}
                        className="p-3.5 flex items-center justify-between bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                            <Flame className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-slate-900">{item.product_name}</p>
                            <p className="text-[11px] text-slate-500">
                              Qty: {item.quantity || 1} · {gbp(item.unit_price || 0)}
                            </p>
                          </div>
                        </div>
                        <span className="font-extrabold text-xs text-slate-900">
                          {gbp(item.total_price || (item.unit_price || 0) * (item.quantity || 1))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CYLINDER EXCHANGE REQUIREMENT CARD */}
              <div
                className={cn(
                  "p-4 rounded-2xl border space-y-2",
                  exchangeReq.required
                    ? "bg-amber-50/70 border-amber-200"
                    : "bg-emerald-50/70 border-emerald-200",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    CYLINDER EXCHANGE
                  </span>
                  <Badge
                    className={cn(
                      "font-extrabold text-[10px] uppercase rounded-full px-2.5 py-0.5",
                      exchangeReq.required
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-emerald-100 text-emerald-900 border-emerald-300",
                    )}
                  >
                    Empty Cylinder Required: {exchangeReq.required ? "Yes" : "No"}
                  </Badge>
                </div>

                {exchangeReq.required ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">
                      Expected Empty Return Quantity: {exchangeReq.expectedQuantity}
                    </p>
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      {exchangeReq.reason ||
                        "Cylinder exchange — empty cylinder verification required prior to OTP verification & completion."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900">
                      New Cylinder Purchase / Standard Supply
                    </p>
                    <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                      First-time or new cylinder purchase — no empty cylinder collection required for this order.
                    </p>
                  </div>
                )}
              </div>

              {/* Immediate Primary Actions based on current status */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                {status === "Assigned" && (
                  <Button
                    disabled={submitting}
                    onClick={() => handleTransition("Accepted")}
                    className="w-full sm:flex-1 rounded-full font-extrabold text-xs h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Accept Delivery
                  </Button>
                )}

                {status === "Accepted" && (
                  <Button
                    disabled={submitting}
                    onClick={() => handleTransition("Out for Delivery")}
                    className="w-full sm:flex-1 rounded-full font-extrabold text-xs h-11 bg-orange-600 hover:bg-orange-700 text-white shadow-md cursor-pointer gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="h-4 w-4" />
                    )}
                    Start Delivery (Out for Delivery)
                  </Button>
                )}

                {status === "Out for Delivery" && (
                  <Button
                    disabled={submitting}
                    onClick={() => {
                      handleTransition("Arrived");
                      setActiveTab("verify_customer");
                    }}
                    className="w-full sm:flex-1 rounded-full font-extrabold text-xs h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4" />
                    )}
                    Mark Arrived
                  </Button>
                )}

                {(status === "Arrived" ||
                  status === "Customer Verified" ||
                  status === "Cylinder Handed Over" ||
                  status === "Empty Cylinder Verified") && (
                  <Button
                    onClick={() => setActiveTab("verify_customer")}
                    className="w-full sm:flex-1 rounded-full font-extrabold text-xs h-11 bg-red-600 hover:bg-red-700 text-white shadow-md cursor-pointer gap-2"
                  >
                    Continue Delivery Verification Workflow <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STEP 1 - CUSTOMER VERIFICATION */}
          {activeTab === "verify_customer" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">
                  STEP 1: CUSTOMER IDENTITY CONFIRMATION
                </span>
                <p className="text-xs text-blue-900 font-medium">
                  Confirm customer presence and drop-off location before beginning cylinder handover.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Customer Name</p>
                  <p className="text-sm font-bold text-slate-900">{order.customer_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Contact Number</p>
                  <p className="text-sm font-bold text-slate-900">
                    {order.customer_phone || "Not specified"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Delivery Drop-off Location
                  </p>
                  <p className="text-xs font-semibold text-slate-700">{addressText}</p>
                </div>
              </div>

              <Button
                disabled={submitting}
                onClick={() => {
                  handleTransition("Customer Verified");
                  setActiveTab("cylinder_handover");
                }}
                className="w-full rounded-full font-extrabold text-xs h-11 bg-red-600 hover:bg-red-700 text-white shadow-md gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                Confirm Customer Identity & Proceed to Handover
              </Button>
            </div>
          )}

          {/* TAB 3: STEP 2 - CYLINDER HANDOVER */}
          {activeTab === "cylinder_handover" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                  STEP 2: FULL CYLINDER HANDOVER CHECKLIST
                </span>
                <p className="text-xs text-slate-600 font-medium">
                  Verify safety guidelines and product condition before handing over full cylinders.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setCheckCustomer(!checkCustomer)}
                  className="w-full p-3.5 rounded-xl border border-slate-200/90 flex items-center gap-3 text-left hover:bg-slate-50 cursor-pointer"
                >
                  {checkCustomer ? (
                    <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800">
                    Customer presence and delivery authorization confirmed
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckProduct(!checkProduct)}
                  className="w-full p-3.5 rounded-xl border border-slate-200/90 flex items-center gap-3 text-left hover:bg-slate-50 cursor-pointer"
                >
                  {checkProduct ? (
                    <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800">
                    Correct cylinder type verified & valve safety seal intact
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckQuantity(!checkQuantity)}
                  className="w-full p-3.5 rounded-xl border border-slate-200/90 flex items-center gap-3 text-left hover:bg-slate-50 cursor-pointer"
                >
                  {checkQuantity ? (
                    <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800">
                    Full cylinder quantity matches order invoice ({items.length || 1} cylinder(s))
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckAddress(!checkAddress)}
                  className="w-full p-3.5 rounded-xl border border-slate-200/90 flex items-center gap-3 text-left hover:bg-slate-50 cursor-pointer"
                >
                  {checkAddress ? (
                    <CheckSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-slate-800">
                    Safe upright cylinder storage position confirmed with customer
                  </span>
                </button>
              </div>

              {exchangeReq.required ? (
                <Button
                  disabled={
                    submitting || !checkCustomer || !checkProduct || !checkQuantity || !checkAddress
                  }
                  onClick={() => {
                    handleTransition("Cylinder Handed Over");
                    setActiveTab("empty_return");
                  }}
                  className="w-full rounded-full font-extrabold text-xs h-11 bg-red-600 hover:bg-red-700 text-white shadow-md gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}
                  Confirm Full Cylinder Handover & Check Empty Cylinder Return
                </Button>
              ) : (
                <Button
                  disabled={
                    submitting || !checkCustomer || !checkProduct || !checkQuantity || !checkAddress
                  }
                  onClick={() => {
                    handleTransition("Cylinder Handed Over");
                    setActiveTab("otp_verification");
                  }}
                  className="w-full rounded-full font-extrabold text-xs h-11 bg-red-600 hover:bg-red-700 text-white shadow-md gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PackageCheck className="h-4 w-4" />
                  )}
                  Confirm Full Cylinder Handover & Proceed to Customer OTP
                </Button>
              )}
            </div>
          )}

          {/* TAB 4: STEP 3 - EMPTY CYLINDER RETURN (ONLY IF REQUIRED) */}
          {activeTab === "empty_return" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                    STEP 3: EMPTY CYLINDER RETURN VERIFICATION
                  </span>
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[10px]">
                    Expected: {exchangeReq.expectedQuantity}
                  </Badge>
                </div>
                <p className="text-xs text-amber-900 font-medium">
                  Exchange requirement: Collect and inspect returned empty LPG cylinders.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-900">
                  Select empty cylinder outcome:
                </Label>
                <RadioGroup
                  value={emptyReceived}
                  onValueChange={(val: any) => setEmptyReceived(val)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50">
                    <RadioGroupItem value="received" id="r1" />
                    <Label
                      htmlFor="r1"
                      className="font-bold text-xs text-slate-800 cursor-pointer flex-1"
                    >
                      ✓ Empty Cylinder Received
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl border border-rose-200/90 bg-rose-50/30 hover:bg-rose-50/60">
                    <RadioGroupItem value="no_cylinder" id="r2" />
                    <Label
                      htmlFor="r2"
                      className="font-bold text-xs text-rose-800 cursor-pointer flex-1"
                    >
                      ⚠ No Empty Cylinder (Records Delivery Exception)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl border border-amber-200/90 bg-amber-50/30 hover:bg-amber-50/60">
                    <RadioGroupItem value="damaged" id="r3" />
                    <Label
                      htmlFor="r3"
                      className="font-bold text-xs text-amber-800 cursor-pointer flex-1"
                    >
                      ⚠ Damaged / Defective Empty Cylinder
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2.5 p-3 rounded-xl border border-amber-200/90 bg-amber-50/30 hover:bg-amber-50/60">
                    <RadioGroupItem value="wrong" id="r4" />
                    <Label
                      htmlFor="r4"
                      className="font-bold text-xs text-amber-800 cursor-pointer flex-1"
                    >
                      ⚠ Wrong Cylinder Brand / Size
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {emptyReceived === "received" ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">
                        Quantity Received
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        value={cylinderCount}
                        onChange={(e) => setCylinderCount(Number(e.target.value) || 1)}
                        className="mt-1 rounded-xl bg-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-bold text-slate-700">
                        Cylinder Condition
                      </Label>
                      <select
                        value={cylinderCondition}
                        onChange={(e) => setCylinderCondition(e.target.value as any)}
                        className="mt-1 w-full rounded-xl bg-white border border-slate-200 p-2 text-xs font-bold text-slate-800"
                      >
                        <option value="Good">Good Condition</option>
                        <option value="Damaged">Damaged / Valve Worn</option>
                        <option value="Unsafe / Requires Inspection">
                          Unsafe / Needs Depot Testing
                        </option>
                        <option value="Wrong Cylinder">Wrong Cylinder Type</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[11px] font-bold text-slate-700">
                      Cylinder Serial / Batch (Optional)
                    </Label>
                    <Input
                      placeholder="e.g. CAL-47-90218"
                      value={cylinderSerial}
                      onChange={(e) => setCylinderSerial(e.target.value)}
                      className="mt-1 rounded-xl bg-white text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="h-4 w-4 text-rose-600" /> Operational Notice:
                  </p>
                  <p className="leading-relaxed">
                    Recording &quot;{emptyReceived.replace("_", " ")}&quot; will create a real delivery exception for depot review. The system will not mark empty cylinders as verified.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-[11px] font-bold text-slate-700">Verification Notes</Label>
                <Textarea
                  placeholder="Additional observations regarding empty cylinder collection..."
                  value={emptyReturnNotes}
                  onChange={(e) => setEmptyReturnNotes(e.target.value)}
                  className="mt-1 rounded-xl bg-white text-xs"
                  rows={2}
                />
              </div>

              <Button
                disabled={submitting}
                onClick={handleVerifyEmpty}
                className="w-full rounded-full font-extrabold text-xs h-11 bg-red-600 hover:bg-red-700 text-white shadow-md gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {emptyReceived === "received"
                  ? "Verify Empty Cylinder & Proceed to Customer OTP"
                  : "Log Exception & Proceed to Customer OTP"}
              </Button>
            </div>
          )}

          {/* TAB 5: STEP 4 - CUSTOMER OTP VERIFICATION */}
          {activeTab === "otp_verification" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800">
                    {exchangeReq.required ? "STEP 4: CUSTOMER OTP VERIFICATION" : "STEP 3: CUSTOMER OTP VERIFICATION"}
                  </span>
                  {otpVerified && (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">
                      Verified ✓
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-indigo-900 font-medium">
                  Ask the customer for the 6-digit delivery verification code displayed in their account / SMS notifications.
                </p>
              </div>

              {otpVerified ? (
                <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-emerald-950">
                      Customer OTP Successfully Verified
                    </h3>
                    <p className="text-xs text-emerald-800 font-medium mt-0.5">
                      Identity & secure delivery handover authenticated at{" "}
                      {otpVerifiedAt ? new Date(otpVerifiedAt).toLocaleTimeString("en-GB") : "just now"}.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab("final_confirmation")}
                    className="rounded-full font-bold text-xs h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md mt-2"
                  >
                    Continue to Final Customer Confirmation <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-5">
                  <div className="h-12 w-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
                    <KeyRound className="h-6 w-6" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-display font-black text-lg text-slate-900">
                      Enter Customer 6-Digit OTP
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Enter the one-time verification passcode provided by {order.customer_name || "the customer"} to authorize delivery handover.
                    </p>
                  </div>

                  {/* 6-Digit InputOTP Control */}
                  <div className="flex justify-center py-2">
                    <InputOTP
                      maxLength={6}
                      value={otpInput}
                      onChange={(val) => {
                        setOtpInput(val);
                        if (otpError) setOtpError(null);
                      }}
                    >
                      <InputOTPGroup className="gap-2 sm:gap-2.5">
                        <InputOTPSlot index={0} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-black rounded-xl border-slate-200 bg-slate-50/70" />
                        <InputOTPSlot index={1} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-black rounded-xl border-slate-200 bg-slate-50/70" />
                        <InputOTPSlot index={2} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-black rounded-xl border-slate-200 bg-slate-50/70" />
                        <InputOTPSlot index={3} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-black rounded-xl border-slate-200 bg-slate-50/70" />
                        <InputOTPSlot index={4} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-black rounded-xl border-slate-200 bg-slate-50/70" />
                        <InputOTPSlot index={5} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl font-mono font-black rounded-xl border-slate-200 bg-slate-50/70" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {otpError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center justify-center gap-1.5 max-w-sm mx-auto">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                    <Button
                      disabled={verifyingOtp || otpInput.length !== 6}
                      onClick={handleVerifyOtp}
                      className="w-full sm:w-auto rounded-full font-black text-xs h-11 px-8 bg-red-600 hover:bg-red-700 text-white shadow-md gap-2"
                    >
                      {verifyingOtp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Verify OTP
                    </Button>

                    <Button
                      variant="outline"
                      disabled={reissuingOtp}
                      onClick={handleResendOtp}
                      className="w-full sm:w-auto rounded-full font-bold text-xs h-11 px-5 border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5"
                    >
                      {reissuingOtp ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      Resend OTP to Customer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: FINAL CONFIRMATION */}
          {activeTab === "final_confirmation" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  FINAL STEP: CUSTOMER CONFIRMATION & COMPLETION
                </span>
                <p className="text-xs text-emerald-900 font-medium">
                  Review complete handover summary before recording order #{order.order_number || delivery.id.slice(0, 8)} as Delivered.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 divide-y divide-slate-100 text-xs space-y-2.5">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Order Reference</span>
                  <span className="font-mono font-bold text-slate-900">#{order.order_number}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Customer</span>
                  <span className="font-bold text-slate-900">{order.customer_name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Delivery Drop-off</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[240px] truncate">
                    {addressText}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Full Cylinder Handover</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Handover Verified
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Empty Cylinder Return</span>
                  <span className="font-bold text-slate-900">
                    {exchangeReq.required
                      ? emptyReceived === "received"
                        ? `Received (${cylinderCondition})`
                        : `Exception Logged (${emptyReceived.replace("_", " ")})`
                      : "Not Required (New Cylinder Purchase)"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Customer OTP Verification</span>
                  <span className={cn("font-bold flex items-center gap-1", otpVerified ? "text-emerald-600" : "text-amber-600")}>
                    {otpVerified ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" /> Verified
                      </>
                    ) : (
                      "Pending OTP Verification"
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Authorized Driver</span>
                  <span className="font-bold text-slate-900">{agentName}</span>
                </div>
              </div>

              {!otpVerified && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Customer OTP verification must be completed prior to finalizing delivery.
                  </span>
                </div>
              )}

              <Button
                disabled={submitting || !otpVerified}
                onClick={() => setShowFinalDialog(true)}
                className="w-full rounded-full font-extrabold text-xs h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirm & Complete Delivery
              </Button>
            </div>
          )}

          {/* TAB 7: REPORT EXCEPTION */}
          {activeTab === "exception" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-800">
                  LOG DELIVERY EXCEPTION / ISSUE
                </span>
                <p className="text-xs text-rose-900 font-medium">
                  Report delivery obstacles, customer unavailability, or cylinder discrepancies.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-800">Issue Category</Label>
                <select
                  value={exceptionType}
                  onChange={(e) => setExceptionType(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 p-2.5 text-xs font-bold text-slate-800"
                >
                  <option value="Customer Unavailable">Customer Unavailable / Not Home</option>
                  <option value="Wrong Address">Wrong Address / Location Access Restricted</option>
                  <option value="No Empty Cylinder">No Empty Cylinder Available</option>
                  <option value="Damaged Empty Cylinder">Damaged Empty Cylinder</option>
                  <option value="Wrong Cylinder">Wrong Cylinder Type</option>
                  <option value="Quantity Mismatch">Quantity Mismatch</option>
                  <option value="Vehicle Issue">Vehicle Issue / Breakdown</option>
                  <option value="Access / Location Issue">Access / Hazard Restriction</option>
                  <option value="Other">Other Logistics Issue</option>
                </select>

                <div>
                  <Label className="text-xs font-bold text-slate-800">Detailed Description</Label>
                  <Textarea
                    placeholder="Provide specific operational details regarding this exception..."
                    value={exceptionNotes}
                    onChange={(e) => setExceptionNotes(e.target.value)}
                    className="mt-1 rounded-xl text-xs"
                    rows={4}
                  />
                </div>
              </div>

              <Button
                disabled={submitting || !exceptionNotes.trim()}
                onClick={handleReportException}
                className="w-full rounded-full font-extrabold text-xs h-11 bg-rose-600 hover:bg-rose-700 text-white shadow-md gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Submit Delivery Exception to Depot & Manager
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* FINAL CONFIRMATION DIALOG */}
      <Dialog open={showFinalDialog} onOpenChange={setShowFinalDialog}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900">
              Confirm Delivery Completion?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 font-medium pt-1">
              This will record order #{order.order_number || delivery.id.slice(0, 8)} as <strong>Delivered</strong>, notify the customer, and register cylinder verification and OTP records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFinalDialog(false)}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              disabled={submitting}
              onClick={async () => {
                setShowFinalDialog(false);
                await handleTransition("Delivered");
              }}
              className="rounded-full text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Confirm & Complete Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
