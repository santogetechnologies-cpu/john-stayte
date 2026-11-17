import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Fuel, Car, ShieldAlert, Check } from "lucide-react";
import { FORECOURT_LOCATIONS, FUEL_TYPES, createDriveOffIncident } from "@/lib/drive-off-service";
import type { FuelDriveOffIncident, DriveOffIncidentType } from "@/types/drive-offs";
import { toast } from "sonner";

interface ReportIncidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBranchId?: string;
  defaultBranchName?: string;
  lockBranch?: boolean;
  actorName: string;
  onIncidentCreated: (newIncident: FuelDriveOffIncident) => void;
}

export function ReportIncidentModal({
  open,
  onOpenChange,
  defaultBranchId,
  defaultBranchName,
  lockBranch = false,
  actorName,
  onIncidentCreated,
}: ReportIncidentModalProps) {
  const [branchId, setBranchId] = useState(defaultBranchId || FORECOURT_LOCATIONS[0].id);
  const [pumpNumber, setPumpNumber] = useState<number>(1);
  const [incidentType, setIncidentType] = useState<DriveOffIncidentType>("drive_off");
  const [vrn, setVrn] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleColour, setVehicleColour] = useState("");
  const [fuelType, setFuelType] = useState(FUEL_TYPES[0]);
  const [litres, setLitres] = useState<string>("40.00");
  const [pricePerLitre, setPricePerLitre] = useState<string>("1.429");
  const [cctvTimestamp, setCctvTimestamp] = useState("");
  const [policeRef, setPoliceRef] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculated total
  const calculatedTotal = (Number(litres || 0) * Number(pricePerLitre || 0)).toFixed(2);

  const selectedBranch = FORECOURT_LOCATIONS.find((b) => b.id === branchId) || FORECOURT_LOCATIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vrn.trim()) {
      toast.error("Please enter the Vehicle Registration Number (VRN)");
      return;
    }
    if (Number(litres) <= 0 || Number(pricePerLitre) <= 0) {
      toast.error("Please provide valid litres and price per litre");
      return;
    }

    setSubmitting(true);
    try {
      const now = new Date();
      const newInc = await createDriveOffIncident({
        branch_id: selectedBranch.id,
        branch_name: selectedBranch.name,
        pump_number: Number(pumpNumber),
        incident_date: now.toISOString().split("T")[0],
        incident_time: now.toTimeString().split(" ")[0],
        occurred_at: now.toISOString(),
        vehicle_registration_number: vrn.toUpperCase().trim(),
        vehicle_make: vehicleMake.trim() || null,
        vehicle_model: vehicleModel.trim() || null,
        vehicle_colour: vehicleColour.trim() || null,
        fuel_type: fuelType,
        litres_dispensed: Number(litres),
        price_per_litre: Number(pricePerLitre),
        total_amount_due: Number(calculatedTotal),
        incident_type: incidentType,
        status: policeRef.trim() ? "police_investigation" : "unpaid",
        police_crime_reference: policeRef.trim() || null,
        cctv_footage_timestamp: cctvTimestamp.trim() || null,
        driver_name: driverName.trim() || null,
        driver_contact_phone: driverPhone.trim() || null,
        notes: notes.trim() || null,
        created_by_name: actorName || "Forecourt Staff",
      });

      toast.success(`Drive-off incident ${newInc.incident_number} logged successfully`);
      onIncidentCreated(newInc);
      onOpenChange(false);

      // Reset form
      setVrn("");
      setVehicleMake("");
      setVehicleModel("");
      setVehicleColour("");
      setNotes("");
      setPoliceRef("");
      setCctvTimestamp("");
      setDriverName("");
      setDriverPhone("");
    } catch (err: any) {
      toast.error("Failed to record incident: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 p-6 sm:p-8 font-sans">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display text-slate-900">
                Report Fuel Drive-Off Incident
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Log a forecourt bilking or No Means to Pay incident for immediate tracking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Incident Type Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setIncidentType("drive_off")}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                incidentType === "drive_off"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Drive-Off (Bilking)
            </button>
            <button
              type="button"
              onClick={() => setIncidentType("no_means_to_pay")}
              className={`py-2 text-xs font-bold rounded-xl transition-all ${
                incidentType === "no_means_to_pay"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              No Means to Pay (Declaration)
            </button>
          </div>

          {/* Section 1: Location & Pump */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Fuel className="h-3.5 w-3.5 text-red-600" /> Forecourt & Pump
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Forecourt Branch</Label>
                {lockBranch ? (
                  <Input
                    value={defaultBranchName || selectedBranch.name}
                    disabled
                    className="mt-1 font-medium bg-slate-100 rounded-xl"
                  />
                ) : (
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="mt-1 rounded-xl bg-white">
                      <SelectValue placeholder="Select Forecourt" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORECOURT_LOCATIONS.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Pump Number</Label>
                <Select
                  value={pumpNumber.toString()}
                  onValueChange={(val) => setPumpNumber(Number(val))}
                >
                  <SelectTrigger className="mt-1 rounded-xl bg-white">
                    <SelectValue placeholder="Select Pump" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBranch.pumps.map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        Pump {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle Identification */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-blue-600" /> Vehicle Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600">
                  Vehicle Reg Number (VRN) *
                </Label>
                <div className="relative mt-1">
                  <Input
                    placeholder="e.g. WP68 XTR"
                    value={vrn}
                    onChange={(e) => setVrn(e.target.value.toUpperCase())}
                    className="font-mono font-bold tracking-widest text-base uppercase bg-amber-50 border-amber-300 rounded-xl text-slate-900"
                    required
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Vehicle Make</Label>
                <Input
                  placeholder="e.g. Ford, BMW, Vauxhall"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  className="mt-1 rounded-xl bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Vehicle Model</Label>
                <Input
                  placeholder="e.g. Focus, 1 Series, Corsa"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="mt-1 rounded-xl bg-white"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Vehicle Colour</Label>
                <Input
                  placeholder="e.g. Silver, Black, Blue"
                  value={vehicleColour}
                  onChange={(e) => setVehicleColour(e.target.value)}
                  className="mt-1 rounded-xl bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Fuel Dispensed & Amount */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-4">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5 text-emerald-600" /> Fuel & Amount Due
              </span>
              <span className="text-red-600 font-extrabold text-sm">
                Total Due: £{calculatedTotal}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-600">Fuel Grade</Label>
                <Select value={fuelType} onValueChange={setFuelType}>
                  <SelectTrigger className="mt-1 rounded-xl bg-white text-xs">
                    <SelectValue placeholder="Select Grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((f) => (
                      <SelectItem key={f} value={f} className="text-xs">
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Litres Dispensed</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  className="mt-1 rounded-xl bg-white font-mono"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-600">Price Per Litre (£)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.01"
                  value={pricePerLitre}
                  onChange={(e) => setPricePerLitre(e.target.value)}
                  className="mt-1 rounded-xl bg-white font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 4: Evidence & Police References */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-600">
                CCTV Camera Timestamp (Optional)
              </Label>
              <Input
                placeholder="e.g. Cam 3 - 14:22:10 to 14:24:00"
                value={cctvTimestamp}
                onChange={(e) => setCctvTimestamp(e.target.value)}
                className="mt-1 rounded-xl bg-white"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-600">
                Police Crime Reference (Optional)
              </Label>
              <Input
                placeholder="e.g. CR/2026/04192"
                value={policeRef}
                onChange={(e) => setPoliceRef(e.target.value)}
                className="mt-1 rounded-xl bg-white"
              />
            </div>
          </div>

          {/* If No Means to Pay, show Driver details */}
          {incidentType === "no_means_to_pay" && (
            <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 space-y-4">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Driver Pledged Information (No Means to Pay)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Driver Name</Label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="mt-1 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-600">Contact Telephone</Label>
                  <Input
                    placeholder="e.g. 07890 000000"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="mt-1 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-600">Forecourt Notes</Label>
            <Textarea
              placeholder="e.g. Driver drove off toward Dursley. Left rear brake light not working."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 rounded-xl bg-white text-xs"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs"
            >
              {submitting ? "Logging Incident..." : "Confirm & Save Incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

