import { useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Phone,
  User,
  Flame,
  ShieldCheck,
  Calendar,
  Clock,
  Loader2,
  X,
  Camera,
  Check,
  Package,
  FileText,
  AlertCircle,
  Truck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CylinderReturnRecord,
  parseReturnMetadata,
  updateReturnPickupWorkflow,
  reportReturnException,
  CylinderCondition,
  CylinderReturnStatus,
} from "@/lib/cylinder-returns-service";
import { useStore } from "@/lib/store";

interface DeliveryReturnPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnRecord: CylinderReturnRecord;
  onWorkflowUpdated: () => void;
}

const EXCEPTION_TYPES = [
  "No Empty Cylinder",
  "Damaged Cylinder",
  "Wrong Cylinder",
  "Quantity Mismatch",
  "Customer Unavailable",
  "Address Inaccessible",
  "Other Issue",
];

export function DeliveryReturnPickupModal({
  isOpen,
  onClose,
  returnRecord,
  onWorkflowUpdated,
}: DeliveryReturnPickupModalProps) {
  const { user } = useStore();
  const meta = returnRecord.metadata || parseReturnMetadata(returnRecord);
  const order = returnRecord.orders || {};

  const pickupAddress =
    meta?.pickup_address ||
    (typeof order.delivery_address === "object" ? order.delivery_address : {});

  const addressString = pickupAddress.street
    ? `${pickupAddress.street}, ${pickupAddress.city || ""} ${pickupAddress.postcode || ""}`.trim()
    : typeof order.delivery_address === "string"
      ? order.delivery_address
      : "Address on file";

  // Current sub-step in pickup flow
  const initialStep = () => {
    const s = (returnRecord.status || "").toLowerCase();
    if (s === "verified" || s === "pickup completed" || s === "completed" || s === "closed")
      return "verified";
    if (
      s === "arrived" ||
      s === "picked up" ||
      s === "under verification" ||
      s === "pending inspection"
    )
      return "receive";
    if (s === "agent en route" || s === "out for pickup" || s === "accepted")
      return "confirm_customer";
    return "overview";
  };

  const [step, setStep] = useState<
    "overview" | "confirm_customer" | "receive" | "verified" | "exception"
  >(initialStep());

  const [verificationChoice, setVerificationChoice] = useState<
    "received" | "no_cylinder" | "damaged" | "wrong_cylinder" | "mismatch"
  >("received");

  const [receivedQty, setReceivedQty] = useState<number>(meta?.quantity || 1);
  const [condition, setCondition] = useState<CylinderCondition>(meta?.condition || "Good");
  const [serialNumber, setSerialNumber] = useState<string>(
    meta?.cylinder_serial || `JSS-CYL-${Math.floor(100000 + Math.random() * 900000)}`,
  );
  const [verificationNotes, setVerificationNotes] = useState<string>(
    meta?.verification_notes || "",
  );

  // Exception state
  const [exceptionType, setExceptionType] = useState<string>(EXCEPTION_TYPES[0]);
  const [exceptionNotes, setExceptionNotes] = useState<string>("");

  const [actionLoading, setActionLoading] = useState(false);

  // Status progression transitions
  const handleTransition = async (newStatus: CylinderReturnStatus) => {
    setActionLoading(true);
    try {
      await updateReturnPickupWorkflow({
        returnAssignmentId: returnRecord.id,
        status: newStatus,
        agentId: user?.id,
        agentName: user?.name || "Dave Jenkins",
        receivedQuantity: receivedQty,
        condition: condition,
        cylinderSerial: serialNumber,
        verificationNotes: verificationNotes,
      });

      toast.success(`Return pickup updated: ${newStatus}`);
      onWorkflowUpdated();

      if (newStatus === "Accepted") {
        setStep("overview");
      } else if (newStatus === "Agent En Route" || newStatus === "Out for Pickup") {
        setStep("confirm_customer");
      } else if (newStatus === "Arrived" || newStatus === "Picked Up") {
        setStep("receive");
      } else if (newStatus === "Verified") {
        setStep("verified");
      } else if (
        newStatus === "Completed" ||
        newStatus === "Closed" ||
        newStatus === "Pickup Completed"
      ) {
        onClose();
      }
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickVerificationOption = (
    option: "received" | "no_cylinder" | "damaged" | "wrong_cylinder" | "mismatch",
  ) => {
    setVerificationChoice(option);
    if (option === "received") {
      setCondition("Good");
    } else if (option === "damaged") {
      setCondition("Damaged");
    } else if (option === "no_cylinder") {
      setExceptionType("No Empty Cylinder");
      setStep("exception");
    } else if (option === "wrong_cylinder") {
      setExceptionType("Wrong Cylinder");
      setStep("exception");
    } else if (option === "mismatch") {
      setExceptionType("Quantity Mismatch");
      setStep("exception");
    }
  };

  const handleVerifyReturn = async () => {
    if (!receivedQty || receivedQty <= 0) {
      toast.error("Please specify a valid received quantity.");
      return;
    }
    if (!serialNumber.trim()) {
      toast.error("Please enter a cylinder serial or identification code.");
      return;
    }

    await handleTransition("Verified");
  };

  const handleReportException = async () => {
    if (!exceptionNotes.trim()) {
      toast.error("Please provide explanation notes for this exception.");
      return;
    }

    setActionLoading(true);
    try {
      await reportReturnException({
        returnAssignmentId: returnRecord.id,
        agentName: user?.name || "Dave Jenkins",
        exceptionType,
        exceptionNotes: exceptionNotes.trim(),
      });

      toast.success("Return exception logged and dispatched to manager.");
      onWorkflowUpdated();
      onClose();
    } catch (err: any) {
      toast.error("Failed to report exception: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const sLower = (returnRecord.status || "").toLowerCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-7 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-50 text-red-700 border-red-200 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase shadow-2xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Return Pickup
              </Badge>
              <span className="font-mono text-xs font-black text-slate-900">
                #{meta?.return_code || returnRecord.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            <Badge variant="outline" className="font-bold text-[10px] rounded-full border-slate-200 text-slate-700">
              {returnRecord.status}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-display font-black text-slate-900 pt-1 tracking-tight">
            Doorstep Cylinder Return & Verification
          </DialogTitle>
        </DialogHeader>

        {/* 1. OVERVIEW / ACCEPT / START EN ROUTE STEP */}
        {step === "overview" && (
          <div className="space-y-4 text-xs">
            {/* Customer & Location Info Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Customer Information
                </span>
                <span className="font-mono font-bold text-slate-700">
                  Order #{meta?.order_number || order.order_number || "ORDER"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      Customer Name
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      {meta?.customer_name || order.customer_name || "Customer"}
                    </span>
                    {(meta?.customer_phone || pickupAddress.phone || order.customer_phone) && (
                      <span className="text-[11px] text-slate-500 block pt-0.5 flex items-center gap-1">
                        <Phone className="h-3 w-3" />{" "}
                        {meta?.customer_phone || pickupAddress.phone || order.customer_phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      Pickup Address
                    </span>
                    <span className="font-semibold text-slate-900 leading-snug block">
                      {addressString}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cylinder Details Box */}
            <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100 space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 block">
                Cylinder Return Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Cylinder Type
                  </span>
                  <span className="font-bold text-slate-900">
                    {meta?.cylinder_name || "LPG Cylinder"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Expected Return Quantity
                  </span>
                  <span className="font-black text-red-600 text-sm">
                    {meta?.quantity || 1} Cylinder{meta?.quantity && meta.quantity > 1 ? "s" : ""}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Return Reason
                  </span>
                  <span className="font-bold text-slate-800">
                    {meta?.reason || "Empty Cylinder Return"}
                  </span>
                </div>
              </div>

              {meta?.scheduled_date && (
                <div className="pt-2 border-t border-red-100/80 flex items-center gap-2 text-slate-700">
                  <Calendar className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span>
                    Scheduled: <strong>{meta.scheduled_date}</strong> ({meta.time_slot || "Morning"}
                    )
                  </span>
                </div>
              )}

              {meta?.customer_notes && (
                <div className="pt-1.5 border-t border-red-100 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Customer Note:</span> "
                  {meta.customer_notes}"
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setStep("exception")}
                className="rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 h-9.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Report Exception
              </Button>

              <div className="flex items-center gap-2">
                {sLower === "pickup assigned" || sLower === "pickup scheduled" ? (
                  <Button
                    onClick={() => handleTransition("Accepted")}
                    disabled={actionLoading}
                    variant="outline"
                    className="rounded-xl font-bold text-xs border-slate-300 text-slate-700 h-9.5 px-4"
                  >
                    Accept Pickup
                  </Button>
                ) : null}

                <Button
                  onClick={() => handleTransition("Agent En Route")}
                  disabled={actionLoading}
                  className="rounded-xl font-extrabold text-xs bg-red-600 hover:bg-red-700 text-white h-9.5 px-5 shadow-xs gap-1.5"
                >
                  {actionLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Truck className="h-3.5 w-3.5" />
                  )}
                  Start Pickup / Agent En Route
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 2. CONFIRM CUSTOMER / EN ROUTE STEP */}
        {step === "confirm_customer" && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Truck className="h-4 w-4 text-red-600" />
                En Route to Customer Destination
              </div>

              <div className="space-y-1.5 text-slate-600">
                <p>
                  <strong className="text-slate-900">{meta?.customer_name || "Customer"}</strong>
                </p>
                <p>{addressString}</p>
                {(meta?.customer_phone || pickupAddress.phone) && (
                  <p className="flex items-center gap-1 text-slate-700 font-bold">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {meta?.customer_phone || pickupAddress.phone}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-200/60">
                  Expecting: {meta?.quantity || 1}x {meta?.cylinder_name} ({meta?.reason})
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setStep("exception")}
                className="rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 h-9.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Customer Unavailable
              </Button>

              <Button
                onClick={() => handleTransition("Arrived")}
                disabled={actionLoading}
                className="rounded-xl font-extrabold text-xs bg-red-600 hover:bg-red-700 text-white h-9.5 px-5 gap-1.5 shadow-xs"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" />
                )}
                Arrived at Customer Address
              </Button>
            </div>
          </div>
        )}

        {/* 3. RECEIVE & VERIFY CYLINDER STEP */}
        {step === "receive" && (
          <div className="space-y-4 text-xs">
            {/* Quick Verification Options */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Verification Options
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickVerificationOption("received")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    verificationChoice === "received"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-black ring-2 ring-emerald-200"
                      : "bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mb-1" />
                  <div className="font-bold text-xs">Empty Cylinder Received</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Standard return verification
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickVerificationOption("damaged")}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    verificationChoice === "damaged"
                      ? "bg-amber-50 border-amber-500 text-amber-950 font-black ring-2 ring-amber-200"
                      : "bg-white border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
                  }`}
                >
                  <AlertCircle className="h-4 w-4 text-amber-600 mb-1" />
                  <div className="font-bold text-xs">Damaged Cylinder</div>
                  <div className="text-[10px] text-slate-500 font-normal">Dent / valve defect</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickVerificationOption("no_cylinder")}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 text-left transition-all cursor-pointer"
                >
                  <X className="h-4 w-4 text-rose-600 mb-1" />
                  <div className="font-bold text-xs">No Empty Cylinder</div>
                  <div className="text-[10px] text-slate-500 font-normal">Report exception</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickVerificationOption("wrong_cylinder")}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 text-left transition-all cursor-pointer"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600 mb-1" />
                  <div className="font-bold text-xs">Wrong Cylinder</div>
                  <div className="text-[10px] text-slate-500 font-normal">Different brand/size</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickVerificationOption("mismatch")}
                  className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 text-left transition-all cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 text-amber-600 mb-1" />
                  <div className="font-bold text-xs">Quantity Mismatch</div>
                  <div className="text-[10px] text-slate-500 font-normal">Count discrepancy</div>
                </button>
              </div>
            </div>

            {/* Cylinder Inspection Capture Box */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <h3 className="font-display font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-red-600" />
                Cylinder Inspection & Verification Details
              </h3>

              {/* Quantity Received */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">Quantity Received:</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => setReceivedQty((prev) => Math.max(1, prev - 1))}
                      className="px-3.5 py-1.5 font-bold text-slate-600 hover:bg-slate-100 text-sm"
                    >
                      -
                    </button>
                    <span className="px-4 py-1.5 font-mono font-black text-slate-900 text-sm">
                      {receivedQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReceivedQty((prev) => prev + 1)}
                      className="px-3.5 py-1.5 font-bold text-slate-600 hover:bg-slate-100 text-sm"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-slate-500 font-medium text-[11px]">
                    (Expected return quantity: {meta?.quantity || 1})
                  </span>
                </div>
              </div>

              {/* Condition Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="font-bold text-slate-800 block">
                  Cylinder Physical Condition:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCondition("Good")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      condition === "Good"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 font-black ring-2 ring-emerald-200"
                        : "bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                    }`}
                  >
                    Good Condition
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondition("Damaged")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      condition === "Damaged"
                        ? "bg-amber-50 border-amber-500 text-amber-950 font-black ring-2 ring-amber-200"
                        : "bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                    }`}
                  >
                    Damaged / Dent
                  </button>

                  <button
                    type="button"
                    onClick={() => setCondition("Unsafe / Requires Inspection")}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      condition === "Unsafe / Requires Inspection"
                        ? "bg-rose-50 border-rose-500 text-rose-950 font-black ring-2 ring-rose-200"
                        : "bg-white border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                    }`}
                  >
                    Unsafe / Test Req.
                  </button>
                </div>
              </div>

              {/* Serial / Barcode ID */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-slate-800 block">
                  Cylinder Identification / Serial <span className="text-red-600">*</span>
                </label>
                <Input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="E.g. JSS-CYL-883921"
                  className="rounded-xl bg-white font-mono text-xs"
                />
              </div>

              {/* Inspection notes */}
              <div className="space-y-1 pt-1">
                <label className="font-bold text-slate-800 block">
                  Verification Notes (Optional):
                </label>
                <Input
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  placeholder="E.g. Valve cap checked, collar undamaged, verified in person..."
                  className="rounded-xl bg-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setStep("exception")}
                className="rounded-xl text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-50 h-9.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Log Exception
              </Button>

              <Button
                onClick={handleVerifyReturn}
                disabled={actionLoading || !receivedQty || !serialNumber.trim()}
                className="rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-9.5 px-5 gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5" />
                )}
                Verify Return
              </Button>
            </div>
          </div>
        )}

        {/* 4. VERIFIED SUMMARY & COMPLETE STEP */}
        {step === "verified" && (
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <div>
                  <h3 className="text-base font-display font-black text-emerald-950">
                    CYLINDER RETURN VERIFIED
                  </h3>
                  <p className="text-[11px] text-emerald-700">
                    Cylinder collection and condition inspection verified in Supabase.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3.5 border border-emerald-100 space-y-2 text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-medium">Received Quantity:</span>
                  <span className="font-bold text-slate-900">
                    {receivedQty} Cylinder{receivedQty > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-medium">Physical Condition:</span>
                  <span className="font-black text-emerald-700">{condition}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-500 font-medium">Cylinder Serial:</span>
                  <span className="font-mono font-bold text-slate-900">{serialNumber}</span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-500 font-medium">Verified by:</span>
                  <span className="font-bold text-slate-900">{user?.name || "Dave Jenkins"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                onClick={() => handleTransition("Completed")}
                disabled={actionLoading}
                className="rounded-xl font-extrabold text-xs bg-slate-900 hover:bg-slate-800 text-white h-9.5 px-6 gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Complete Pickup
              </Button>
            </div>
          </div>
        )}

        {/* 5. EXCEPTION REPORTING VIEW */}
        {step === "exception" && (
          <div className="space-y-4 text-xs">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="font-display font-black text-rose-950 text-sm">
                  Report Cylinder Return Pickup Exception
                </h3>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Exception Category</label>
                  <select
                    value={exceptionType}
                    onChange={(e) => setExceptionType(e.target.value)}
                    className="w-full rounded-xl bg-white border border-rose-200 p-2.5 text-xs font-bold text-slate-800"
                  >
                    {EXCEPTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Details & Reason for Dispatch & Customer{" "}
                    <span className="text-rose-600">*</span>
                  </label>
                  <Textarea
                    value={exceptionNotes}
                    onChange={(e) => setExceptionNotes(e.target.value)}
                    placeholder="Provide specific notes (e.g. Customer not at home, no empty bottle available, cylinder is from another brand)..."
                    className="rounded-xl bg-white border-rose-200 text-xs resize-none h-24"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setStep("receive")}
                className="rounded-xl text-xs font-bold h-9.5 px-4"
              >
                Back
              </Button>

              <Button
                onClick={handleReportException}
                disabled={actionLoading || !exceptionNotes.trim()}
                className="rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-700 text-white h-9.5 px-5 gap-1.5 shadow-xs cursor-pointer"
              >
                {actionLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                Submit Exception Report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
