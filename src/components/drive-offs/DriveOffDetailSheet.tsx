import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Fuel,
  Car,
  ShieldAlert,
  Clock,
  MapPin,
  PoundSterling,
  Printer,
  CheckCircle2,
  FileText,
  BadgeAlert,
} from "lucide-react";
import type { FuelDriveOffIncident, DriveOffStatus } from "@/types/drive-offs";
import { recordDriveOffPayment, updateDriveOffStatus } from "@/lib/drive-off-service";
import { toast } from "sonner";

interface DriveOffDetailSheetProps {
  incident: FuelDriveOffIncident | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorName: string;
  onIncidentUpdated: (updated: FuelDriveOffIncident) => void;
}

const getStatusBadgeConfig = (status: DriveOffStatus | string) => {
  switch (status) {
    case "paid":
      return {
        label: "PAID",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    case "partial_payment":
      return {
        label: "PARTIAL PAYMENT",
        className: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "police_investigation":
      return {
        label: "POLICE INVESTIGATION",
        className: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "disputed":
      return {
        label: "DISPUTED",
        className: "bg-purple-50 text-purple-700 border-purple-200",
      };
    case "written_off":
      return {
        label: "WRITTEN OFF",
        className: "bg-slate-100 text-slate-700 border-slate-300",
      };
    case "unpaid":
    default:
      return {
        label: (status || "unpaid").replace(/_/g, " ").toUpperCase(),
        className: "bg-red-50 text-red-700 border-red-200",
      };
  }
};

export function DriveOffDetailSheet({
  incident,
  open,
  onOpenChange,
  actorName,
  onIncidentUpdated,
}: DriveOffDetailSheetProps) {
  const [paymentAmount, setPaymentAmount] = useState<string>(
    incident && incident.balance_remaining > 0 ? incident.balance_remaining.toFixed(2) : "0.00",
  );
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [receiptRef, setReceiptRef] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [status, setStatus] = useState<DriveOffStatus>(incident?.status ?? "unpaid");
  const [policeRef, setPoliceRef] = useState(incident?.police_crime_reference || "");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Synchronize local form state when incident updates via Realtime
  useEffect(() => {
    if (incident) {
      setPaymentAmount(
        incident.balance_remaining > 0 ? incident.balance_remaining.toFixed(2) : "0.00",
      );
      setStatus(incident.status);
      setPoliceRef(incident.police_crime_reference || "");
    }
  }, [incident?.id, incident?.balance_remaining, incident?.status, incident?.police_crime_reference]);

  if (!incident) return null;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await recordDriveOffPayment(
        incident.id,
        amt,
        paymentMethod,
        actorName || "Forecourt Cashier",
        receiptRef,
      );

      if (res.success && res.updatedIncident) {
        toast.success(`Payment of £${amt.toFixed(2)} recorded successfully`);
        onIncidentUpdated(res.updatedIncident);
        setPaymentAmount(res.updatedIncident.balance_remaining.toFixed(2));
        setStatus(res.updatedIncident.status);
      } else {
        toast.error("Failed to record payment");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    try {
      await updateDriveOffStatus(incident.id, status, policeRef.trim() || undefined);
      toast.success("Incident status updated");
      onIncidentUpdated({
        ...incident,
        status,
        police_crime_reference: policeRef.trim() || null,
      });
    } catch (e: any) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrintPoliceReport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Police Incident Report - ${incident.incident_number}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: auto; }
          h1 { color: #dc2626; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 4px; }
          .sub { color: #64748b; font-size: 14px; margin-bottom: 24px; }
          .badge { display: inline-block; background: #fef08a; border: 2px solid #ca8a04; font-family: monospace; font-weight: bold; font-size: 20px; padding: 4px 12px; border-radius: 6px; letter-spacing: 2px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
          .card h3 { margin-top: 0; font-size: 13px; text-transform: uppercase; color: #475569; }
          .field { margin-bottom: 8px; font-size: 14px; }
          .field strong { color: #0f172a; }
          .total { font-size: 22px; font-weight: bold; color: #dc2626; margin-top: 10px; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>John Stayte Services – Fuel Drive-Off Incident Report</h1>
        <div class="sub">Prepared for Gloucestershire Constabulary · Reference: ${incident.incident_number}</div>
        
        <div style="margin: 20px 0;">
          <div class="badge">${incident.vehicle_registration_number}</div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Incident Location & Time</h3>
            <div class="field"><strong>Forecourt:</strong> ${incident.branch_name}</div>
            <div class="field"><strong>Pump Number:</strong> Pump ${incident.pump_number}</div>
            <div class="field"><strong>Date:</strong> ${incident.incident_date}</div>
            <div class="field"><strong>Time:</strong> ${incident.incident_time}</div>
            <div class="field"><strong>CCTV Camera:</strong> ${incident.cctv_footage_timestamp || "Available on site"}</div>
          </div>
          <div class="card">
            <h3>Vehicle Identification</h3>
            <div class="field"><strong>Registration (VRN):</strong> ${incident.vehicle_registration_number}</div>
            <div class="field"><strong>Make:</strong> ${incident.vehicle_make || "Unspecified"}</div>
            <div class="field"><strong>Model:</strong> ${incident.vehicle_model || "Unspecified"}</div>
            <div class="field"><strong>Colour:</strong> ${incident.vehicle_colour || "Unspecified"}</div>
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <h3>Fuel Dispensation</h3>
            <div class="field"><strong>Fuel Grade:</strong> ${incident.fuel_type}</div>
            <div class="field"><strong>Litres Dispensed:</strong> ${incident.litres_dispensed} L</div>
            <div class="field"><strong>Price / Litre:</strong> £${incident.price_per_litre.toFixed(3)}</div>
            <div class="total">Total Due: £${incident.total_amount_due.toFixed(2)}</div>
            <div class="field" style="margin-top: 6px;"><strong>Outstanding Balance:</strong> £${incident.balance_remaining.toFixed(2)}</div>
          </div>
          <div class="card">
            <h3>Incident Status & Reference</h3>
            <div class="field"><strong>Classification:</strong> ${incident.incident_type === "drive_off" ? "Drive-Off (Bilking)" : "No Means to Pay"}</div>
            <div class="field"><strong>Police Crime Ref:</strong> ${incident.police_crime_reference || "Pending"}</div>
            <div class="field"><strong>Reported By:</strong> ${incident.created_by_name}</div>
            <div class="field"><strong>Forecourt Notes:</strong> ${incident.notes || "None"}</div>
          </div>
        </div>

        <div class="footer">
          <p>Certified accurate by John Stayte Services Forecourt Operations. Registered Office: 15 The Gallop, Sutton, SM2 5RU.</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const statusConfig = getStatusBadgeConfig(incident.status);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6 font-sans">
        <SheetHeader className="pb-4 border-b border-slate-100 pr-12 -mt-2">
          <div className="flex items-center justify-between gap-3 min-h-7">
            <span className="text-xs font-mono font-bold text-slate-500 tracking-wider">
              {incident.incident_number}
            </span>
            <Badge
              variant="outline"
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${statusConfig.className}`}
            >
              {statusConfig.label}
            </Badge>
          </div>
          <SheetTitle className="text-xl font-bold font-display text-slate-900 mt-1">
            Drive-Off Incident Details
          </SheetTitle>
          <SheetDescription className="text-xs text-slate-500">
            Recorded at {incident.branch_name} on {incident.incident_date} at {incident.incident_time}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-4">
          {/* VRN & Vehicle Showcase */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                Vehicle Registration
              </span>
              <div className="inline-block mt-1 px-3 py-1 bg-amber-300 text-slate-950 font-mono font-extrabold text-xl rounded-lg tracking-widest border border-amber-400 shadow-xs">
                {incident.vehicle_registration_number}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-800 block">
                {[incident.vehicle_colour, incident.vehicle_make, incident.vehicle_model]
                  .filter(Boolean)
                  .join(" ") || "Vehicle Unspecified"}
              </span>
              <span className="text-xs text-slate-500">Pump {incident.pump_number}</span>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Due</span>
              <span className="text-base font-extrabold text-slate-900">
                £{incident.total_amount_due.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Paid</span>
              <span className="text-base font-extrabold text-emerald-600">
                £{incident.amount_paid.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Balance</span>
              <span className="text-base font-extrabold text-red-600">
                £{incident.balance_remaining.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Fuel & Pump Specs */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Fuel Type:</span>
              <span className="font-bold text-slate-800">{incident.fuel_type}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Quantity Dispensed:</span>
              <span className="font-mono font-bold text-slate-800">
                {incident.litres_dispensed} Litres
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Price Per Litre:</span>
              <span className="font-mono font-bold text-slate-800">
                £{incident.price_per_litre.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">CCTV Camera Reference:</span>
              <span className="font-mono font-medium text-slate-800">
                {incident.cctv_footage_timestamp || "Recorded on forecourt NVR"}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Police Crime Ref:</span>
              <span className="font-mono font-bold text-blue-700">
                {incident.police_crime_reference || "Not yet assigned"}
              </span>
            </div>
            {incident.notes && (
              <div className="py-2">
                <span className="text-slate-500 font-medium block mb-1">Notes:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-200/60">
                  "{incident.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Record Settlement Form */}
          {incident.balance_remaining > 0 && (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <PoundSterling className="h-4 w-4 text-emerald-600" /> Record Settlement / Payment
              </div>
              <form onSubmit={handleRecordPayment} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Amount (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      max={incident.balance_remaining}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="mt-1 bg-white rounded-xl font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-600">Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-1 bg-white rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Card">Card Till Receipt</SelectItem>
                        <SelectItem value="Cash">Cash At Till</SelectItem>
                        <SelectItem value="BACS">Bank Transfer (BACS)</SelectItem>
                        <SelectItem value="Online">Online Payment Gateway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Receipt Reference</Label>
                  <Input
                    placeholder="e.g. Till #2 - Txn 9821"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    className="mt-1 bg-white rounded-xl text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={recordingPayment}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9"
                >
                  {recordingPayment ? "Saving Payment..." : "Record Payment & Clear Balance"}
                </Button>
              </form>
            </div>
          )}

          {/* Quick Status & Police Reference Editor */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Update Status & Police File
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Incident Status</Label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as DriveOffStatus)}
                >
                  <SelectTrigger className="mt-1 bg-white rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="police_investigation">Police Investigation</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="written_off">Written Off</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Police Crime Ref</Label>
                <Input
                  placeholder="e.g. CR/2026/04192"
                  value={policeRef}
                  onChange={(e) => setPoliceRef(e.target.value)}
                  className="mt-1 bg-white rounded-xl text-xs"
                />
              </div>
            </div>
            <Button
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
              variant="outline"
              className="w-full rounded-xl text-xs font-bold h-9"
            >
              {updatingStatus ? "Saving Changes..." : "Save Status Changes"}
            </Button>
          </div>

          {/* Print Action */}
          <Button
            onClick={handlePrintPoliceReport}
            variant="outline"
            className="w-full rounded-xl text-xs font-bold h-10 border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2"
          >
            <Printer className="h-4 w-4" /> Export Police Incident Pack (Print / PDF)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

