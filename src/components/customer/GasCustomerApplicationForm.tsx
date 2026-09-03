import { useState, useRef, useEffect } from "react";
import {
  FileText,
  User,
  MapPin,
  Flame,
  Building2,
  Package,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  Loader2,
  PenTool,
  Eraser,
  Phone,
  Mail,
  Home,
  Factory,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  submitGasCustomerApplication,
  GasCustomerApplication,
} from "@/lib/application-service";

interface GasCustomerApplicationFormProps {
  initialUsage?: "DOMESTIC" | "COMMERCIAL" | "BULK";
  onSuccess?: (application: GasCustomerApplication) => void;
  onCancel?: () => void;
  embedded?: boolean;
}

export function GasCustomerApplicationForm({
  initialUsage = "DOMESTIC",
  onSuccess,
  onCancel,
  embedded = false,
}: GasCustomerApplicationFormProps) {
  const { user } = useStore();

  // Section 1: Customer Details
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("Gloucester");
  const [postcode, setPostcode] = useState("");

  // Section 2: Delivery & Billing Info
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [hasDifferentBilling, setHasDifferentBilling] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("Phone");

  // Section 3: Gas Usage
  const [usageType, setUsageType] = useState<"DOMESTIC" | "COMMERCIAL" | "BULK">(initialUsage);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("Hospitality / Catering");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessContact, setBusinessContact] = useState("");

  // Section 4: Cylinder Info
  const [existingCylinderStatus, setExistingCylinderStatus] = useState("New Customer (No Existing Cylinders)");
  const [cylinderType, setCylinderType] = useState("Propane (Red)");
  const [cylinderSize, setCylinderSize] = useState("13kg");
  const [orderRequirement, setOrderRequirement] = useState("New Cylinder + Gas Purchase");

  // Section 5: Declaration
  const [declarationAccepted, setDeclarationAccepted] = useState(false);

  // Section 6: Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sync user defaults
  useEffect(() => {
    if (user) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.email && !email) setEmail(user.email);
    }
  }, [user]);

  // Set up canvas drawing on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI canvas setup
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
  }, []);

  // Canvas drawing helper functions
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Form submission with complete validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      return toast.error("Please sign in to complete your Gas Customer Application.");
    }

    if (!fullName.trim()) return toast.error("Please enter your full name.");
    if (!email.trim() || !email.includes("@")) return toast.error("Please enter a valid email address.");
    if (!phone.trim() || phone.trim().length < 7) return toast.error("Please enter a valid phone number.");
    if (!streetAddress.trim()) return toast.error("Please enter your street address.");
    if (!postcode.trim() || postcode.trim().length < 4) return toast.error("Please enter a valid UK postcode.");

    if ((usageType === "COMMERCIAL" || usageType === "BULK") && !businessName.trim()) {
      return toast.error("Please enter your registered business or trade name.");
    }

    if (!declarationAccepted) {
      return toast.error("You must confirm and accept the declaration checkbox.");
    }

    if (!hasSigned || !canvasRef.current) {
      return toast.error("Please sign in the digital signature pad before submitting.");
    }

    // Get signature data URL
    const signatureData = canvasRef.current.toDataURL("image/png");

    setSubmitting(true);
    try {
      const savedApp = await submitGasCustomerApplication({
        customerId: user.id,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        streetAddress: streetAddress.trim(),
        city: city.trim() || "Gloucester",
        postcode: postcode.trim().toUpperCase(),
        deliveryAddress: deliveryAddress.trim() || `${streetAddress}, ${city} ${postcode}`,
        billingAddress: hasDifferentBilling ? billingAddress.trim() : undefined,
        preferredContactMethod,
        usageType,
        businessName: businessName.trim() || undefined,
        businessType: businessType.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        businessContact: businessContact.trim() || undefined,
        existingCylinderStatus,
        cylinderType,
        cylinderSize,
        orderRequirement,
        declarationAccepted: true,
        signatureData,
      });

      toast.success("Gas Customer Application submitted successfully!");
      if (onSuccess) {
        onSuccess(savedApp);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit customer application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 space-y-8 text-left shadow-sm",
        embedded ? "border-0 p-0 shadow-none" : ""
      )}
    >
      {/* Header Banner */}
      <div className="space-y-2 border-b border-slate-100 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-red-600">
          <Flame className="h-3.5 w-3.5 text-primary" />
          <span>Official Calor Gas Distributor • Customer Onboarding</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
          Gas Customer Application Form
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
          To comply with UK Pressure Systems & Gas Safety Regulations, all new customers must complete this application once before placing their first gas cylinder or refill order.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CUSTOMER DETAILS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <User className="h-4 w-4 text-primary" /> 1. Customer Personal Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Full Legal Name *</Label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. David Clarke"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Date of Birth (Optional)</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="rounded-xl h-11 text-xs bg-white"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Email Address *</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. david.clarke@example.com"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Contact Telephone Number *</Label>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01452 741234 or 07700 900123"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Preferred Contact Method</Label>
            <select
              value={preferredContactMethod}
              onChange={(e) => setPreferredContactMethod(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold"
            >
              <option value="Phone">Telephone / Mobile</option>
              <option value="Email">Email</option>
              <option value="SMS">SMS Text Message</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Street Address *</Label>
            <Input
              required
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="e.g. Highfield House, Bristol Road"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Town / City *</Label>
            <Input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Gloucester / Stroud / Stonehouse"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Postcode *</Label>
            <Input
              required
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="e.g. GL10 3RA"
              className="rounded-xl h-11 text-xs uppercase"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DELIVERY & BILLING INFORMATION */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <MapPin className="h-4 w-4 text-primary" /> 2. Delivery & Site Information
        </h3>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Delivery Drop-Off Address (if different from above)</Label>
            <Input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Leave blank to use primary street address above..."
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={hasDifferentBilling}
              onChange={(e) => setHasDifferentBilling(e.target.checked)}
              className="h-4 w-4 rounded text-primary"
            />
            <span>Billing address is different from delivery address</span>
          </label>

          {hasDifferentBilling && (
            <div className="space-y-1 pt-1">
              <Label className="text-xs font-bold text-slate-700">Billing Address & Postcode *</Label>
              <Textarea
                rows={2}
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Full billing address for invoices..."
                className="rounded-xl text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: GAS USAGE CLASSIFICATION */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Flame className="h-4 w-4 text-primary" /> 3. Gas Usage Classification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              type: "DOMESTIC" as const,
              title: "🏠 Domestic LPG",
              desc: "For home cooking, central heating, and patio BBQ use.",
              icon: Home,
            },
            {
              type: "COMMERCIAL" as const,
              title: "🏨 Commercial LPG",
              desc: "For hotels, pubs, restaurants, catering, and FLT fleets.",
              icon: Building2,
            },
            {
              type: "BULK" as const,
              title: "🏭 Bulk / Industrial",
              desc: "For large static bulk vessels and forecourt supply.",
              icon: Factory,
            },
          ].map((item) => (
            <button
              key={item.type}
              type="button"
              onClick={() => setUsageType(item.type)}
              className={cn(
                "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2",
                usageType === item.type
                  ? "border-primary bg-red-50/30 ring-2 ring-primary/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between">
                <item.icon className={cn("h-5 w-5", usageType === item.type ? "text-primary" : "text-slate-400")} />
                <Badge variant={usageType === item.type ? "default" : "outline"} className="text-[10px]">
                  {item.type}
                </Badge>
              </div>
              <p className="font-extrabold text-xs text-slate-900">{item.title}</p>
              <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Dynamic Business Information for Commercial / Bulk */}
        {(usageType === "COMMERCIAL" || usageType === "BULK") && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-4">
            <p className="text-xs font-black text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" /> Commercial Business Details
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Registered Business Name *</Label>
                <Input
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Cotswold Arms Hotel Ltd"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Business Sector / Trade</Label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold"
                >
                  <option value="Hospitality / Catering">Hospitality / Hotel / Restaurant</option>
                  <option value="Pub / Draught Line">Pub / Bar / Brewery</option>
                  <option value="Warehousing / FLT Fleet">Industrial Forklift Fleet (FLT)</option>
                  <option value="Agriculture / Farming">Agriculture / Farm Heating</option>
                  <option value="Construction / Roofing">Construction / Bitumen / Roofing</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Accounts / Business Phone</Label>
                <Input
                  value={businessContact}
                  onChange={(e) => setBusinessContact(e.target.value)}
                  placeholder="e.g. 01452 800900"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Trading Address (if different)</Label>
                <Input
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. Commercial Unit 4, Whitminster"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: CYLINDER INFORMATION */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Package className="h-4 w-4 text-primary" /> 4. Cylinder Requirements
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Existing Cylinder Status</Label>
            <select
              value={existingCylinderStatus}
              onChange={(e) => setExistingCylinderStatus(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold"
            >
              <option value="New Customer (No Existing Cylinders)">New Customer (No Empty Cylinders to Return)</option>
              <option value="Have Empty Calor Propane">Have Empty Calor Propane Cylinder for Exchange</option>
              <option value="Have Empty Calor Butane">Have Empty Calor Butane Cylinder for Exchange</option>
              <option value="Have Empty Patio Gas">Have Empty Patio Gas Cylinder for Exchange</option>
              <option value="Bulk Tank on Site">Static Bulk Tank Vessel on Premises</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Primary Gas Type</Label>
            <select
              value={cylinderType}
              onChange={(e) => setCylinderType(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold"
            >
              <option value="Propane (Red)">Propane (Red Bottle - 37mbar)</option>
              <option value="Butane (Blue)">Butane (Blue Bottle - 28mbar)</option>
              <option value="Patio Gas (Green)">Patio Gas (Green Bottle - 27mm)</option>
              <option value="Forklift LPG">Forklift FLT Liquid LPG</option>
              <option value="Cellar Pub Gas">Cellar Pub Dispense Gas</option>
              <option value="Bulk Propane Tank">Bulk Propane Road Tanker</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Target Cylinder Size</Label>
            <select
              value={cylinderSize}
              onChange={(e) => setCylinderSize(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold"
            >
              <option value="13kg">13kg (Domestic / Heating)</option>
              <option value="47kg">47kg (Commercial Heavy-Duty)</option>
              <option value="19kg">19kg (Commercial Catering / Roofing)</option>
              <option value="18kg FLT">18kg FLT (Forklift Truck)</option>
              <option value="15kg">15kg (Butane Indoor Heater)</option>
              <option value="5kg Patio">5kg / 13kg Patio Gas (BBQ)</option>
              <option value="6kg Propane">6kg Propane (Caravan / Camping)</option>
              <option value="Bulk Vessel">1,000L - 4,000L Static Bulk Tank</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: DECLARATION & TERMS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 text-xs">
        <h3 className="font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5 text-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> 5. Safety Declaration & Agreement
        </h3>
        <p className="text-slate-600 leading-relaxed text-[11px]">
          By submitting this application, I declare that all cylinders will be stored upright in well-ventilated areas away from heat sources and ignition. For refill exchanges, I confirm an empty cylinder of equivalent group will be returned upon delivery or scheduled pickup.
        </p>

        <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
          <input
            type="checkbox"
            required
            checked={declarationAccepted}
            onChange={(e) => setDeclarationAccepted(e.target.checked)}
            className="h-4 w-4 rounded text-primary focus:ring-primary mt-0.5"
          />
          <span className="font-bold text-slate-900 text-xs leading-snug">
            I confirm that the information provided is accurate and agree to John Stayte Services terms of gas supply. *
          </span>
        </label>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6: DIGITAL SIGNATURE PAD */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <PenTool className="h-4 w-4 text-primary" /> 6. Customer Digital Signature *
          </h3>
          {hasSigned && (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              ✓ Signature Captured
            </Badge>
          )}
        </div>

        <p className="text-[11px] text-slate-500">
          Please sign below using your finger, stylus, mouse, or trackpad.
        </p>

        <div className="relative rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-2xs">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-36 sm:h-44 touch-none cursor-crosshair bg-slate-50/40"
          />

          {!hasSigned && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-slate-400 font-bold">
              Sign inside this box ✍️
            </div>
          )}

          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              className="rounded-full h-7 px-2.5 text-[10px] font-bold gap-1 bg-white/90 shadow-2xs border-slate-300 hover:bg-slate-100"
            >
              <Eraser className="h-3 w-3" /> Clear Signature
            </Button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIONS */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-full px-6 py-2.5 h-11 font-bold text-slate-700"
          >
            Cancel
          </Button>
        ) : <div />}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto rounded-full px-8 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer h-12"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Submitting application...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>Submit Gas Customer Application</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
