import { useState } from "react";
import { RotateCcw, Package, MapPin, Calendar, Clock, Loader2, Flame } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCylinderReturnRequest, ReturnReason } from "@/lib/cylinder-returns-service";
import { useStore } from "@/lib/store";

interface CylinderReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  eligibleCylinders: Array<{ id?: string; name: string; quantity: number }>;
  onReturnSubmitted?: () => void;
}

const RETURN_REASONS: ReturnReason[] = [
  "Cylinder Return",
  "Empty Cylinder Pickup",
  "Cylinder Exchange",
  "Other",
];

const TIME_SLOTS = [
  "Morning Window (08:00 - 12:00)",
  "Afternoon Window (12:00 - 16:00)",
  "Evening Window (16:00 - 19:00)",
  "Flexible All-Day Window",
];

export function CylinderReturnModal({
  isOpen,
  onClose,
  order,
  eligibleCylinders,
  onReturnSubmitted,
}: CylinderReturnModalProps) {
  const { user } = useStore();

  const cylinders =
    eligibleCylinders.length > 0
      ? eligibleCylinders
      : [
          {
            name: "LPG Gas Cylinder",
            quantity: 1,
          },
        ];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedCylinderIndex, setSelectedCylinderIndex] = useState<number>(0);
  const currentCylinder = cylinders[selectedCylinderIndex] || cylinders[0];

  const [returnQty, setReturnQty] = useState<number>(1);
  const [returnReason, setReturnReason] = useState<ReturnReason>("Cylinder Return");
  const [preferredDate, setPreferredDate] = useState<string>(defaultDateStr);
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<string>(TIME_SLOTS[0]);
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!order) return null;

  const maxQty = Math.max(1, Number(currentCylinder.quantity) || 1);
  const deliveryAddress = typeof order.delivery_address === "object" ? order.delivery_address : {};

  // Formatted address line
  const formattedAddress =
    [
      deliveryAddress.street || order.shipping_address,
      deliveryAddress.city,
      deliveryAddress.postcode,
    ]
      .filter(Boolean)
      .join(", ") || "Address on file";

  // Formatted delivered date
  const deliveredDateStr = order.delivered_at
    ? new Date(order.delivered_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : order.updated_at
      ? new Date(order.updated_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Recent Delivery";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (returnQty < 1 || returnQty > maxQty) {
      setValidationError(`Please select a valid quantity between 1 and ${maxQty}.`);
      return;
    }

    if (!preferredDate) {
      setValidationError("Please select a preferred pickup date.");
      return;
    }

    setSubmitting(true);
    try {
      await createCylinderReturnRequest({
        orderId: order.id,
        orderNumber: order.order_number || order.id.slice(0, 8),
        customerId: order.customer_id || user?.id || "",
        customerName: order.customer_name || user?.name || "Customer",
        customerEmail: order.customer_email || user?.email || "",
        customerPhone: order.customer_phone || (user as any)?.phone || "",
        pickupAddress: deliveryAddress,
        cylinderProductId: currentCylinder.id,
        cylinderName: currentCylinder.name,
        quantity: returnQty,
        reason: returnReason,
        preferredDate,
        preferredTimeSlot,
        notes: additionalNotes.trim() || undefined,
      });

      toast.success("Cylinder pickup request submitted successfully.");
      if (onReturnSubmitted) {
        onReturnSubmitted();
      }
      onClose();
    } catch (err: any) {
      toast.error("Failed to submit pickup request: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[560px] w-[calc(100vw-32px)] sm:w-full p-0 rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        {/* HEADER */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 text-left bg-white">
          <DialogTitle className="text-lg sm:text-xl font-display font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-600 shrink-0" />
            Request Cylinder Pickup
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Arrange a convenient time for us to collect your cylinder.
          </p>
        </DialogHeader>

        {/* MODAL BODY (SCROLLABLE) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 text-xs text-slate-700">
            {/* SECTION 1 — ORDER DETAILS */}
            <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="font-bold uppercase text-[10px] tracking-wider text-slate-400">
                  Order Details
                </span>
                <span className="font-mono font-bold text-slate-800 text-xs">
                  #{order.order_number || order.id.slice(0, 8)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                <div className="flex items-start gap-2">
                  <Flame className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                      Product / Cylinder
                    </span>
                    <span
                      className="font-semibold text-slate-900 text-xs block truncate"
                      title={currentCylinder.name}
                    >
                      {currentCylinder.name}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Package className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                      Delivered Quantity
                    </span>
                    <span className="font-semibold text-slate-900 text-xs block">
                      {maxQty} Cylinder{maxQty > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                      Delivered Date
                    </span>
                    <span className="font-semibold text-slate-900 text-xs block">
                      {deliveredDateStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:col-span-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                      Pickup Address
                    </span>
                    <span
                      className="font-semibold text-slate-900 text-xs block truncate"
                      title={formattedAddress}
                    >
                      {formattedAddress}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 — CYLINDER TO RETURN */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Cylinder to Return
              </label>
              <Select
                value={String(selectedCylinderIndex)}
                onValueChange={(val) => {
                  setSelectedCylinderIndex(Number(val));
                  setReturnQty(1);
                  setValidationError(null);
                }}
              >
                <SelectTrigger className="w-full rounded-xl bg-slate-50 border-slate-200 text-xs font-medium text-slate-900 h-10 px-3 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center gap-2 truncate">
                    <Flame className="h-3.5 w-3.5 text-red-600 shrink-0" />
                    <span className="font-semibold text-slate-900 truncate">
                      {currentCylinder.name}
                    </span>
                    <span className="text-slate-400 text-[11px] font-normal shrink-0">
                      ({currentCylinder.quantity} delivered)
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {cylinders.map((cyl, idx) => (
                    <SelectItem key={idx} value={String(idx)} className="text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <Flame className="h-3.5 w-3.5 text-red-600" />
                        <span>{cyl.name}</span>
                        <span className="text-slate-400">({cyl.quantity} delivered)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SECTION 3 — RETURN DETAILS */}
            <div className="space-y-3.5">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Return Details
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Reason <span className="text-red-600">*</span>
                </label>
                <Select
                  value={returnReason}
                  onValueChange={(val) => {
                    setReturnReason(val as ReturnReason);
                    setValidationError(null);
                  }}
                >
                  <SelectTrigger className="w-full rounded-xl bg-slate-50 border-slate-200 text-xs font-medium h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs font-medium">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity Stepper */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800">
                    Quantity to Return <span className="text-red-600">*</span>
                  </label>
                  {maxQty > 1 && (
                    <span className="text-slate-400 font-normal text-[11px]">Max: {maxQty}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setReturnQty((prev) => Math.max(1, prev - 1));
                        setValidationError(null);
                      }}
                      disabled={returnQty <= 1}
                      className="h-8 w-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-colors text-sm"
                    >
                      −
                    </button>
                    <span className="px-3.5 py-1 font-mono font-bold text-slate-900 text-xs">
                      {returnQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setReturnQty((prev) => Math.min(maxQty, prev + 1));
                        setValidationError(null);
                      }}
                      disabled={returnQty >= maxQty}
                      className="h-8 w-8 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent rounded-lg transition-colors text-sm"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {returnQty} cylinder{returnQty > 1 ? "s" : ""} selected
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 4 — PICKUP SCHEDULE */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Pickup Schedule
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Preferred Pickup Date <span className="text-red-600">*</span>
                    </span>
                  </label>
                  <Input
                    type="date"
                    min={todayStr}
                    value={preferredDate}
                    onChange={(e) => {
                      setPreferredDate(e.target.value);
                      setValidationError(null);
                    }}
                    className="rounded-xl text-xs bg-slate-50 border-slate-200 h-10 font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Preferred Time Slot <span className="text-red-600">*</span>
                    </span>
                  </label>
                  <Select
                    value={preferredTimeSlot}
                    onValueChange={(val) => {
                      setPreferredTimeSlot(val);
                      setValidationError(null);
                    }}
                  >
                    <SelectTrigger className="w-full rounded-xl bg-slate-50 border-slate-200 text-xs font-medium h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map((slot) => (
                        <SelectItem key={slot} value={slot} className="text-xs font-medium">
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SECTION 5 — ADDITIONAL NOTES */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  Additional Notes
                </label>
                <span className="text-[11px] text-slate-400 font-normal">Optional</span>
              </div>
              <Textarea
                value={additionalNotes}
                maxLength={300}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Add any instructions that may help our delivery team..."
                className="rounded-xl text-xs resize-none bg-slate-50 border-slate-200 h-20 sm:h-22 placeholder:text-slate-400 focus:bg-white transition-colors"
              />
              <div className="flex justify-end">
                <span className="text-[10px] text-slate-400 font-medium">
                  {additionalNotes.length}/300
                </span>
              </div>
            </div>

            {/* Validation error message if any */}
            {validationError && (
              <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {validationError}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-slate-100 shrink-0 bg-white flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl text-xs font-bold h-10 px-4 text-slate-700 hover:bg-slate-100 border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-xs h-10 px-5 gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Pickup Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
