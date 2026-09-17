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
  Send,
  KeyRound,
  Home,
  Factory,
  Car,
  ShieldAlert,
  Info,
  Calendar,
  Check,
  Truck,
  Wrench,
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
  sendApplicationEmailOtp,
  verifyApplicationEmailOtp,
  GasCustomerApplication,
} from "@/lib/application-service";

interface GasCustomerApplicationFormProps {
  initialUsage?: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS";
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

  // =========================================================================
  // SECTION 1: CUSTOMER PERSONAL DETAILS
  // =========================================================================
  const [title, setTitle] = useState("Mr");
  const [fullName, setFullName] = useState(user?.name || "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [preferredContactMethod, setPreferredContactMethod] = useState("Phone");

  // =========================================================================
  // SECTION 2: DELIVERY & SITE INFORMATION
  // =========================================================================
  const [houseNumberOrName, setHouseNumberOrName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("Gloucester");
  const [county, setCounty] = useState("Gloucestershire");
  const [postcode, setPostcode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [hasDifferentDelivery, setHasDifferentDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [hasDifferentBilling, setHasDifferentBilling] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");

  // =========================================================================
  // SECTION 3: GAS USAGE
  // =========================================================================
  const [selectedUsages, setSelectedUsages] = useState<Array<"DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS">>([
    initialUsage || "DOMESTIC",
  ]);
  const [estimatedConsumption, setEstimatedConsumption] = useState(
    "1 - 2 Cylinders / Month (Domestic Heating/Cooking)",
  );
  const [primaryAppliances, setPrimaryAppliances] = useState<string[]>([
    "Central Heating Boiler",
    "Outdoor Patio Heater / BBQ",
  ]);
  // Commercial / Bulk specific fields
  const [businessName, setBusinessName] = useState("");
  const [tradingName, setTradingName] = useState("");
  const [companyRegOrVat, setCompanyRegOrVat] = useState("");
  const [businessType, setBusinessType] = useState("Hospitality / Catering");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessContact, setBusinessContact] = useState("");

  // =========================================================================
  // SECTION 4: GAS & CYLINDER REQUIREMENTS (MULTI-SELECT)
  // =========================================================================
  const [selectedGasTypes, setSelectedGasTypes] = useState<string[]>([
    "Propane LPG (Red Bottles - 37mbar POL)",
    "Patio Gas (Green Bottles - 27mm Clip-on)",
  ]);
  const [selectedCylinderSizes, setSelectedCylinderSizes] = useState<string[]>([
    "13kg Propane (Domestic Heating & Cooking)",
    "13kg Patio Gas (BBQ & Patio Heaters)",
  ]);
  const [existingCylinderStatus, setExistingCylinderStatus] = useState(
    "New Customer (No Existing Cylinders)",
  );
  const [initialQuantity, setInitialQuantity] = useState("2 Cylinders (1 Active + 1 Reserve Bank)");
  const [storageLocation, setStorageLocation] = useState(
    "Outdoor Ventilated Hardstanding / Solid Plinth",
  );
  const [regulatorType, setRegulatorType] = useState(
    "Automatic Changeover Valve (Dual Bottle 2-Pack)",
  );

  // =========================================================================
  // SECTION 5: SAFETY DECLARATION & TERMS
  // =========================================================================
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [storageConfirmed, setStorageConfirmed] = useState(false);

  // =========================================================================
  // SECTION 6: EMAIL VERIFICATION (DIRECTLY ABOVE SIGNATURE)
  // =========================================================================
  const [verificationStep, setVerificationStep] = useState<"ENTER_EMAIL" | "ENTER_OTP" | "VERIFIED">(
    "ENTER_EMAIL",
  );
  const [otpSentTo, setOtpSentTo] = useState<string>("");
  const [otpCode, setOtpCode] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // =========================================================================
  // SECTION 7: CUSTOMER DIGITAL SIGNATURE
  // =========================================================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailSectionRef = useRef<HTMLDivElement | null>(null);

  // Sync user defaults once on initial load
  const hasInitializedUserRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedUserRef.current && user) {
      if (user.name && !fullName) setFullName(user.name);
      if (user.email && !email) setEmail(user.email);
      hasInitializedUserRef.current = true;
    }
  }, [user]);

  // Countdown timer for resending OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleEmailChange = (newVal: string) => {
    setEmail(newVal);
    setOtpError(null);
    if (verifiedEmail && newVal.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
      setVerifiedEmail(null);
      setVerificationStep("ENTER_EMAIL");
      setOtpCode("");
      setOtpSentTo("");
    }
  };

  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
      setOtpError("Please enter a valid email address to receive your verification code.");
      toast.error("Please enter a valid email address to receive your verification code.");
      return;
    }
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await sendApplicationEmailOtp(cleanEmail);
      setOtpSentTo(cleanEmail);
      setVerificationStep("ENTER_OTP");
      setCooldown(60);
      setOtpCode("");
      toast.success(res.message || `Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      const msg = err.message || "Failed to send verification code. Please try again.";
      setOtpError(msg);
      toast.error(msg);
      setVerificationStep("ENTER_EMAIL");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanCode = otpCode.trim();
    if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setOtpError("Please enter the complete 6-digit numeric verification code.");
      toast.error("Please enter the complete 6-digit numerical code sent to your email.");
      return;
    }
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const targetEmail = otpSentTo || email.trim().toLowerCase();
      const res = await verifyApplicationEmailOtp(targetEmail, cleanCode);
      if (res.ok) {
        setVerifiedEmail(res.verifiedEmail);
        setVerificationStep("VERIFIED");
        setOtpError(null);
        toast.success("✓ Email verified successfully! You can now digitally sign and submit your application.");
      }
    } catch (err: any) {
      const msg = err.message || "Invalid or expired verification code.";
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || sendingOtp) return;
    const targetEmail = otpSentTo || email.trim().toLowerCase();
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await sendApplicationEmailOtp(targetEmail);
      setCooldown(60);
      setOtpCode("");
      toast.success(`A fresh 6-digit code was sent to ${targetEmail}`);
    } catch (err: any) {
      const msg = err.message || "Failed to resend verification code. Please try again.";
      setOtpError(msg);
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleChangeEmailClick = () => {
    setVerificationStep("ENTER_EMAIL");
    setVerifiedEmail(null);
    setOtpCode("");
    setOtpError(null);
    setOtpSentTo("");
  };

  const toggleUsageType = (type: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS") => {
    setSelectedUsages((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) {
          toast.info("Please keep at least one gas usage category selected.");
          return prev;
        }
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const toggleGasType = (gasName: string) => {
    setSelectedGasTypes((prev) =>
      prev.includes(gasName)
        ? prev.length > 1
          ? prev.filter((g) => g !== gasName)
          : (toast.info("Select at least one gas type requirement."), prev)
        : [...prev, gasName],
    );
  };

  const toggleCylinderSize = (sizeName: string) => {
    setSelectedCylinderSizes((prev) =>
      prev.includes(sizeName)
        ? prev.length > 1
          ? prev.filter((s) => s !== sizeName)
          : (toast.info("Select at least one cylinder size."), prev)
        : [...prev, sizeName],
    );
  };

  const toggleAppliance = (applianceName: string) => {
    setPrimaryAppliances((prev) =>
      prev.includes(applianceName)
        ? prev.filter((item) => item !== applianceName)
        : [...prev, applianceName],
    );
  };

  const isCommercialOrBulk =
    selectedUsages.includes("COMMERCIAL") || selectedUsages.includes("BULK");

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

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
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

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
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

    if (!fullName.trim()) return toast.error("Please enter your full legal name.");
    if (!email.trim() || !email.includes("@"))
      return toast.error("Please enter a valid email address.");

    if (!phone.trim() || phone.trim().length < 7)
      return toast.error("Please enter a valid contact phone number.");
    if (!streetAddress.trim()) return toast.error("Please enter your street address.");
    if (!city.trim()) return toast.error("Please enter your town or city.");
    if (!postcode.trim() || postcode.trim().length < 4)
      return toast.error("Please enter a valid UK postcode.");

    if (isCommercialOrBulk && !businessName.trim()) {
      return toast.error("Please enter your registered business name for commercial onboarding.");
    }

    if (!declarationAccepted || !storageConfirmed) {
      return toast.error("Please review and accept both safety declaration checkboxes before proceeding.");
    }

    // Mandatory 2-Step Email Verification check
    if (
      !verifiedEmail ||
      verifiedEmail.toLowerCase() !== email.trim().toLowerCase() ||
      verificationStep !== "VERIFIED"
    ) {
      if (emailSectionRef.current) {
        emailSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return toast.error(
        "Please complete Step 6: Email Verification (Send code & verify 6-digit OTP) before submitting your application.",
      );
    }

    if (!hasSigned || !canvasRef.current) {
      return toast.error("Please provide your digital signature in Section 7 before submitting.");
    }

    // Primary usage category for DB compatibility
    const primaryUsageCategory: "DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS" =
      selectedUsages.includes("COMMERCIAL")
        ? "COMMERCIAL"
        : selectedUsages.includes("BULK")
          ? "BULK"
          : selectedUsages.includes("AUTOGAS")
            ? "AUTOGAS"
            : "DOMESTIC";

    // Build formatted street and delivery notes
    const formattedStreet = houseNumberOrName.trim()
      ? `${houseNumberOrName.trim()}, ${streetAddress.trim()}`
      : streetAddress.trim();

    const formattedDelivery = hasDifferentDelivery && deliveryAddress.trim()
      ? deliveryAddress.trim()
      : `${formattedStreet}, ${city.trim()}, ${county.trim()} ${postcode.trim().toUpperCase()}`;

    // Combine enriched multi-select cylinder requirements
    const combinedRequirementNotes = [
      `Gas Usages: ${selectedUsages.join(", ")}`,
      `Gas Types: ${selectedGasTypes.join(", ")}`,
      `Cylinder Sizes: ${selectedCylinderSizes.join(", ")}`,
      `Initial Qty: ${initialQuantity}`,
      `Regulator: ${regulatorType}`,
      `Storage: ${storageLocation}`,
      `Est. Monthly: ${estimatedConsumption}`,
      primaryAppliances.length > 0 ? `Appliances: ${primaryAppliances.join(", ")}` : "",
      deliveryNotes.trim() ? `Site Notes: ${deliveryNotes.trim()}` : "",
      altPhone.trim() ? `Alt Phone: ${altPhone.trim()}` : "",
      title ? `Title: ${title}` : "",
      tradingName.trim() ? `Trading As: ${tradingName.trim()}` : "",
      companyRegOrVat.trim() ? `VAT/Reg: ${companyRegOrVat.trim()}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    // Get signature data URL
    const signatureData = canvasRef.current.toDataURL("image/png");

    setSubmitting(true);
    try {
      const savedApp = await submitGasCustomerApplication({
        customerId: user.id,
        fullName: `${title ? title + " " : ""}${fullName.trim()}`,
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth.trim() || undefined,
        streetAddress: formattedStreet,
        city: city.trim() || "Gloucester",
        postcode: postcode.trim().toUpperCase(),
        deliveryAddress: formattedDelivery,
        billingAddress: hasDifferentBilling && billingAddress.trim() ? billingAddress.trim() : undefined,
        preferredContactMethod,
        usageType: primaryUsageCategory,
        businessName: businessName.trim() || undefined,
        businessType: businessType.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
        businessContact: businessContact.trim() || undefined,
        existingCylinderStatus,
        cylinderType: selectedGasTypes.join(", "),
        cylinderSize: selectedCylinderSizes.join(", "),
        orderRequirement: combinedRequirementNotes,
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
        "rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 space-y-9 text-left shadow-sm",
        embedded ? "border-0 p-0 shadow-none" : "",
      )}
    >
      {/* Header Banner */}
      <div className="space-y-2 border-b border-slate-100 pb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-red-600">
          <Flame className="h-3.5 w-3.5 text-primary" />
          <span>Official Calor Gas Distributor • Customer Onboarding Application</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
          Gas Customer Application &amp; Account Registration
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl">
          Complete this onboarding form once to register your premises for Calor Gas supplies,
          deliveries, and safety verification in compliance with UK Pressure Systems Safety Regulations
          (PSSR 2000).
        </p>
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 font-medium flex items-center gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong>Unrestricted Account:</strong> This application is for onboarding and safety
            compliance. Once approved, your account is NOT restricted to one gas type — you can purchase
            any cylinder size or product across the catalogue at checkout.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CUSTOMER PERSONAL DETAILS */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
              1
            </span>
            <User className="h-4 w-4 text-primary" /> Customer Personal Details
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">* Required fields</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1 sm:col-span-1 lg:col-span-1">
            <Label className="text-xs font-bold text-slate-700">Title</Label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 bg-white text-xs font-bold text-slate-800"
            >
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-3">
            <Label className="text-xs font-bold text-slate-700">Full Legal Name *</Label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. David Alexander Clarke"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Email Address (Primary Account) *</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              placeholder="e.g. customer@example.com"
              className="rounded-xl h-11 text-xs bg-white"
            />
            <p className="text-[10px] text-slate-400">
              Will be verified via 6-digit security code in Section 6 before signing.
            </p>
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Date of Birth (Optional)</Label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="rounded-xl h-11 text-xs bg-white"
            />
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Primary Contact Phone *</Label>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 01452 741234 or 07700 900123"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Alternative / Mobile Phone (Optional)</Label>
            <Input
              type="tel"
              value={altPhone}
              onChange={(e) => setAltPhone(e.target.value)}
              placeholder="e.g. 07900 123456 (For driver delivery SMS)"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label className="text-xs font-bold text-slate-700">Preferred Contact Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "Phone", label: "Telephone Call" },
                { id: "Email", label: "Email Notice" },
                { id: "SMS", label: "SMS Text Message" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreferredContactMethod(m.id)}
                  className={cn(
                    "h-10 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                    preferredContactMethod === m.id
                      ? "border-primary bg-red-50 text-primary ring-1 ring-primary"
                      : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DELIVERY & SITE INFORMATION */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
              2
            </span>
            <MapPin className="h-4 w-4 text-primary" /> Delivery &amp; Site Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1 sm:col-span-1 lg:col-span-1">
            <Label className="text-xs font-bold text-slate-700">Property / House No. / Name</Label>
            <Input
              value={houseNumberOrName}
              onChange={(e) => setHouseNumberOrName(e.target.value)}
              placeholder="e.g. Flat 2 / Oak Cottage"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-3">
            <Label className="text-xs font-bold text-slate-700">Street Address *</Label>
            <Input
              required
              value={streetAddress}
              onChange={(e) => setStreetAddress(e.target.value)}
              placeholder="e.g. Bristol Road, Whitminster"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <Label className="text-xs font-bold text-slate-700">Town / City *</Label>
            <Input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Gloucester / Stroud / Stonehouse"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-1">
            <Label className="text-xs font-bold text-slate-700">County</Label>
            <Input
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="e.g. Gloucestershire"
              className="rounded-xl h-11 text-xs"
            />
          </div>

          <div className="space-y-1 sm:col-span-1 lg:col-span-1">
            <Label className="text-xs font-bold text-slate-700">Postcode *</Label>
            <Input
              required
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.toUpperCase())}
              placeholder="e.g. GL10 3RA"
              className="rounded-xl h-11 text-xs uppercase font-mono font-bold"
            />
          </div>

          <div className="space-y-1 sm:col-span-2 lg:col-span-4">
            <Label className="text-xs font-bold text-slate-700">
              Site Access &amp; Delivery Drop-Off Instructions (Optional)
            </Label>
            <Input
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Leave cylinders by side gate; keypad 1234; narrow driveway; beware of dog."
              className="rounded-xl h-11 text-xs"
            />
          </div>

          {/* Delivery & Billing Toggles */}
          <div className="sm:col-span-2 lg:col-span-4 space-y-3 pt-1 border-t border-slate-100">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={hasDifferentDelivery}
                onChange={(e) => setHasDifferentDelivery(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
              <span>Delivery drop-off address is different from primary premises address</span>
            </label>

            {hasDifferentDelivery && (
              <div className="space-y-1 pl-6 pt-1">
                <Label className="text-xs font-bold text-slate-700">Dedicated Drop-Off Address *</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Rear Yard / Farm Barn Access, Whitminster Lane, GL10 3RA"
                  className="rounded-xl h-11 text-xs"
                />
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={hasDifferentBilling}
                onChange={(e) => setHasDifferentBilling(e.target.checked)}
                className="h-4 w-4 rounded text-primary focus:ring-primary"
              />
              <span>Billing address is different from delivery address (e.g. Accounts Dept / Head Office)</span>
            </label>

            {hasDifferentBilling && (
              <div className="space-y-1 pl-6 pt-1">
                <Label className="text-xs font-bold text-slate-700">Billing Address &amp; Postcode *</Label>
                <Textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Full legal billing address for invoices..."
                  className="rounded-xl text-xs"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: GAS USAGE (MULTI-SELECT SUPPORTED) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
                3
              </span>
              <Flame className="h-4 w-4 text-primary" /> Gas Usage
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Select all classifications that apply to your account (Multi-select enabled)
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold text-slate-600">
            {selectedUsages.length} Selected
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              type: "DOMESTIC" as const,
              title: "🏠 Domestic",
              desc: "Home heating, range cookers, fires, mobile heaters & garden BBQ.",
              icon: Home,
            },
            {
              type: "COMMERCIAL" as const,
              title: "🏨 Commercial",
              desc: "Hotels, pubs, restaurants, catering trailers & FLT fleets.",
              icon: Building2,
            },
            {
              type: "BULK" as const,
              title: "🏭 Bulk / Industrial",
              desc: "Multi-cylinder manifolds, process heating, agriculture & bulk vessels.",
              icon: Factory,
            },
            {
              type: "AUTOGAS" as const,
              title: "🚗 Autogas",
              desc: "Road vehicle LPG autogas refuelling, adapters, and vehicle fleets.",
              icon: Car,
            },
          ].map((item) => {
            const isSelected = selectedUsages.includes(item.type);
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => toggleUsageType(item.type)}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2 relative",
                  isSelected
                    ? "border-primary bg-red-50/50 ring-2 ring-primary/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-600",
                )}
              >
                <div className="flex items-center justify-between">
                  <item.icon
                    className={cn("h-5 w-5", isSelected ? "text-primary" : "text-slate-400")}
                  />
                  <Badge
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "text-[10px]",
                      isSelected ? "bg-primary text-white" : "text-slate-400",
                    )}
                  >
                    {isSelected ? "✓ Active" : "Click to Add"}
                  </Badge>
                </div>
                <p className="font-extrabold text-xs text-slate-900">{item.title}</p>
                <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Estimated Consumption Pattern</Label>
            <select
              value={estimatedConsumption}
              onChange={(e) => setEstimatedConsumption(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 bg-white text-xs font-bold"
            >
              <option value="1 - 2 Cylinders / Month (Domestic Heating/Cooking)">
                1 - 2 Cylinders / Month (Standard Domestic)
              </option>
              <option value="3 - 5 Cylinders / Month (High-demand Domestic / Small Commercial)">
                3 - 5 Cylinders / Month (High-Demand Domestic / Light Commercial)
              </option>
              <option value="6 - 10 Cylinders / Month (Commercial Hospitality / Catering)">
                6 - 10 Cylinders / Month (Commercial Hospitality / Catering)
              </option>
              <option value="10+ Cylinders / Month (Industrial / Multi-Appliance Manifold)">
                10+ Cylinders / Month (Industrial / Multi-Cylinder Manifold)
              </option>
              <option value="Seasonal / Occasional (Patio, BBQ, Mobile Heaters)">
                Seasonal / Occasional (Summer Patio, BBQ, Winter Mobile Heaters)
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Primary Gas Appliances Connected</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                "Central Heating Boiler",
                "Range Cooker / Oven",
                "Living Room Gas Fire",
                "Mobile Radiant Heater",
                "Outdoor Patio Heater / BBQ",
                "Forklift Truck (FLT)",
                "Pub Draught Line Dispense",
                "Commercial Kitchen Cookers",
              ].map((appliance) => {
                const active = primaryAppliances.includes(appliance);
                return (
                  <button
                    key={appliance}
                    type="button"
                    onClick={() => toggleAppliance(appliance)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1",
                      active
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
                    )}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {appliance}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dynamic Business Information for Commercial / Bulk */}
        {isCommercialOrBulk && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5 space-y-4 animate-in fade-in-50 duration-200">
            <p className="text-xs font-black text-blue-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Building2 className="h-4 w-4 text-blue-600" /> Commercial Business &amp; Trade Information
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Registered Business Name *</Label>
                <Input
                  required={isCommercialOrBulk}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Cotswold Arms Hotel Ltd"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Trading Name / DBA (if different)</Label>
                <Input
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  placeholder="e.g. The Cotswold Arms"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Company Reg No. / VAT Number</Label>
                <Input
                  value={companyRegOrVat}
                  onChange={(e) => setCompanyRegOrVat(e.target.value)}
                  placeholder="e.g. GB 123 4567 89 / 09876543"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Business Sector / Industry</Label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold"
                >
                  <option value="Hospitality / Catering">Hospitality / Hotel / Restaurant</option>
                  <option value="Pub / Bar / Brewery">Pub / Bar / Brewery</option>
                  <option value="Mobile Catering / Food Truck">Mobile Catering / Food Truck</option>
                  <option value="Warehousing / FLT Fleet">Industrial Forklift Fleet (FLT)</option>
                  <option value="Agriculture / Farming">Agriculture / Farm Heating</option>
                  <option value="Construction / Roofing">Construction / Bitumen / Roofing</option>
                  <option value="Holiday Park / Glamping">Holiday Park / Glamping / Caravan Site</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Accounts Contact Person &amp; Phone</Label>
                <Input
                  value={businessContact}
                  onChange={(e) => setBusinessContact(e.target.value)}
                  placeholder="e.g. Sarah Jenkins - 01452 800900"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Trading Site Address</Label>
                <Input
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="e.g. Unit 4 Whitminster Industrial Estate"
                  className="rounded-xl h-10 text-xs bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: GAS & CYLINDER REQUIREMENTS (MULTI-SELECT) */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
                4
              </span>
              <Package className="h-4 w-4 text-primary" /> Gas &amp; Cylinder Requirements
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Multi-Select: Choose any gas types and cylinder sizes you require. You can purchase any
              catalogue items anytime.
            </p>
          </div>
        </div>

        {/* 4A: Gas Types / Products Required (Multi-Select) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Gas Types / Products Required (Multi-Select)</span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {selectedGasTypes.length} Selected
              </Badge>
            </Label>
            <span className="text-[10px] text-slate-400 font-medium">Click to select multiple</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {[
              {
                id: "Propane LPG (Red Bottles - 37mbar POL)",
                label: "Propane Gas (LPG)",
                detail: "Red Bottles • 37mbar POL • Home Heating, Cooking & Outdoor",
                color: "border-red-300 bg-red-50/40 text-red-950",
              },
              {
                id: "Butane Gas (Blue Bottles - 28mbar 21mm)",
                label: "Butane Gas",
                detail: "Blue Bottles • 28mbar Clip • Indoor Portable Heaters & Caravans",
                color: "border-blue-300 bg-blue-50/40 text-blue-950",
              },
              {
                id: "Patio Gas (Green Bottles - 27mm Clip-on)",
                label: "Patio Gas / BBQ",
                detail: "Green Bottles • 27mm Clip • Patio Heaters, BBQs & Pizza Ovens",
                color: "border-emerald-300 bg-emerald-50/40 text-emerald-950",
              },
              {
                id: "Forklift FLT Gas (Liquid Offtake)",
                label: "Forklift Gas (FLT)",
                detail: "Red Cylinders • Liquid Offtake • Warehouse & Industrial Forklifts",
                color: "border-amber-300 bg-amber-50/40 text-amber-950",
              },
              {
                id: "Cellar & Beverage Dispense Gas (CO2 / Mixed)",
                label: "Cellar & Dispense Gas",
                detail: "Air Liquide CO2 & Mixed Gas • Pub Draught Line Dispense",
                color: "border-purple-300 bg-purple-50/40 text-purple-950",
              },
              {
                id: "Autogas (Vehicle LPG Refuelling)",
                label: "Automotive Autogas",
                detail: "Road LPG Fuel • Vehicle Refuelling & Adapters",
                color: "border-sky-300 bg-sky-50/40 text-sky-950",
              },
              {
                id: "Solid Fuel & Kiln Dried Logs",
                label: "Solid Fuel & Firewood",
                detail: "Kiln Dried Hardwood Logs, Smokeless Coal & Kindling",
                color: "border-stone-300 bg-stone-50/40 text-stone-950",
              },
            ].map((g) => {
              const isChecked = selectedGasTypes.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGasType(g.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between gap-2",
                    isChecked
                      ? cn("ring-2 ring-primary/20", g.color)
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600",
                  )}
                >
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-xs text-slate-900">{g.label}</p>
                    <p className="text-[10px] text-slate-500 leading-tight">{g.detail}</p>
                  </div>
                  <div
                    className={cn(
                      "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                      isChecked
                        ? "bg-primary border-primary text-white"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4B: Cylinder Sizes Required (Multi-Select) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>Cylinder Sizes Required (Multi-Select)</span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {selectedCylinderSizes.length} Selected
              </Badge>
            </Label>
            <span className="text-[10px] text-slate-400 font-medium">Click to select multiple</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {[
              { id: "47kg Propane (Heavy Commercial)", label: "47kg Propane", desc: "Heavy Heating / 2-4 Bank" },
              { id: "19kg Propane (Catering/Trade)", label: "19kg Propane", desc: "Catering & Roofing" },
              { id: "13kg Propane (Domestic Heating & Cooking)", label: "13kg Propane", desc: "Domestic Ranges" },
              { id: "6kg / 3.9kg Propane (Caravans)", label: "6kg Propane", desc: "Caravans & Boats" },
              { id: "18kg FLT (Forklift Offtake)", label: "18kg FLT", desc: "Forklift Trucks" },
              { id: "15kg Butane (Indoor Heaters)", label: "15kg Butane", desc: "Indoor Portable" },
              { id: "7kg Butane (Caravans)", label: "7kg Butane", desc: "Compact Indoor" },
              { id: "13kg Patio Gas (BBQ & Patio Heaters)", label: "13kg Patio", desc: "Large BBQ / Heaters" },
              { id: "5kg Patio Gas (Compact BBQ)", label: "5kg Patio", desc: "Compact BBQ" },
              { id: "Bulk Propane / Autogas", label: "Bulk / Autogas", desc: "Bulk Road Delivery" },
            ].map((sz) => {
              const isChecked = selectedCylinderSizes.includes(sz.id);
              return (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => toggleCylinderSize(sz.id)}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20",
                    isChecked
                      ? "border-primary bg-red-50/50 ring-1 ring-primary text-slate-900"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-600",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-900">{sz.label}</span>
                    <div
                      className={cn(
                        "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                        isChecked
                          ? "bg-primary border-primary text-white"
                          : "border-slate-300 bg-white",
                      )}
                    >
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium leading-tight">{sz.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4C: Quantity & Setup Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Existing Cylinder Status</Label>
            <select
              value={existingCylinderStatus}
              onChange={(e) => setExistingCylinderStatus(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 bg-white text-xs font-bold"
            >
              <option value="New Customer (No Existing Cylinders)">
                New Customer (No Empties for Exchange)
              </option>
              <option value="Have Empty Calor Propane">Have Empty Calor Propane (Red)</option>
              <option value="Have Empty Calor Butane">Have Empty Calor Butane (Blue)</option>
              <option value="Have Empty Patio Gas">Have Empty Patio Gas (Green 27mm)</option>
              <option value="Have Multiple Mixed Cylinders">Have Multiple Mixed Empty Cylinders</option>
              <option value="Switching / Upgrading Size">Switching / Upgrading Cylinder Group</option>
              <option value="Bulk Tank on Site">Static Bulk Vessel on Premises</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Initial Quantity / Bank Setup</Label>
            <select
              value={initialQuantity}
              onChange={(e) => setInitialQuantity(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 bg-white text-xs font-bold"
            >
              <option value="1 Cylinder">1 Cylinder (Single Setup)</option>
              <option value="2 Cylinders (1 Active + 1 Reserve Bank)">
                2 Cylinders (1 Active + 1 Reserve)
              </option>
              <option value="4 Cylinders (2x2 Auto-Changeover Manifold)">
                4 Cylinders (2x2 Auto-Changeover)
              </option>
              <option value="6+ Commercial Fleet Pack">6+ Cylinders (Fleet / Commercial Pack)</option>
              <option value="Order As Needed per Checkout">Order As Needed per Checkout</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Regulator / Manifold Connection</Label>
            <select
              value={regulatorType}
              onChange={(e) => setRegulatorType(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 bg-white text-xs font-bold"
            >
              <option value="Automatic Changeover Valve (Dual Bottle 2-Pack)">
                Dual Auto-Changeover Valve (2-Pack)
              </option>
              <option value="Single Propane Screw-on POL Regulator (37mbar)">
                Single Propane POL Screw-on (37mbar)
              </option>
              <option value="27mm Clip-on Easy-Fit Regulator (Patio Gas)">
                27mm Clip-on Easy-Fit (Patio Gas)
              </option>
              <option value="21mm Clip-on Butane Regulator (Blue Bottle)">
                21mm Clip-on Butane (Blue Bottle)
              </option>
              <option value="4-Pack Manifold with OPSO / UPSO Valve">
                4-Pack Manifold with OPSO Safety Valve
              </option>
              <option value="FLT Quick-Release Flexible Hose Fitting">
                FLT Quick-Release Fitting (Forklift)
              </option>
              <option value="Existing Regulator Already Fitted">
                Existing Regulator / Customer Setup
              </option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Cylinder Storage Location</Label>
            <select
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-3 bg-white text-xs font-bold"
            >
              <option value="Outdoor Ventilated Hardstanding / Solid Plinth">
                Outdoor Ventilated Hardstanding
              </option>
              <option value="Secure Lockable Steel Gas Cage">
                Secure Lockable Steel Gas Cage
              </option>
              <option value="Vehicle / Caravan Integrated Gas Locker">
                Vehicle / Caravan Integrated Gas Locker
              </option>
              <option value="Commercial Catering Sited Compound">
                Commercial Catering Compound
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: SAFETY DECLARATION & TERMS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-4 text-xs">
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
            5
          </span>
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <h3 className="font-black uppercase tracking-wider text-slate-900 text-xs sm:text-sm">
            Safety Compliance &amp; Gas Supply Agreement
          </h3>
        </div>

        <p className="text-slate-600 leading-relaxed text-xs">
          Under the <strong>UK Pressure Systems Safety Regulations 2000</strong> and <strong>UK Gas Safety (Installation and Use) Regulations 1998</strong>, all LPG cylinder customers must adhere to strict handling, ventilation, and connection protocols.
        </p>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-2xs hover:border-slate-300 transition-colors">
            <input
              type="checkbox"
              required
              checked={storageConfirmed}
              onChange={(e) => setStorageConfirmed(e.target.checked)}
              className="h-4 w-4 rounded text-primary focus:ring-primary mt-0.5"
            />
            <span className="font-bold text-slate-900 text-xs leading-snug">
              I confirm that all gas cylinders will be stored upright in well-ventilated outdoor areas, away from drains, cellar openings, heat sources, and combustible materials. *
            </span>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-2xs hover:border-slate-300 transition-colors">
            <input
              type="checkbox"
              required
              checked={declarationAccepted}
              onChange={(e) => setDeclarationAccepted(e.target.checked)}
              className="h-4 w-4 rounded text-primary focus:ring-primary mt-0.5"
            />
            <span className="font-bold text-slate-900 text-xs leading-snug">
              I agree to John Stayte Services terms of gas supply, cylinder refill exchange rules, and cylinder rental conditions. I confirm that all details provided in this application are true and accurate. *
            </span>
          </label>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6: EMAIL VERIFICATION — MUST COME DIRECTLY BEFORE SIGNATURE */}
      {/* ========================================================================= */}
      <div
        ref={emailSectionRef}
        id="email-verification-section"
        className="space-y-4 rounded-2xl border-2 border-slate-300 bg-slate-50/80 p-5 sm:p-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/90 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
              6
            </span>
            <div className="h-7 w-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <Label className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 block">
                Email Address &amp; 2-Step Identity Verification *
              </Label>
              <p className="text-[11px] text-slate-500 font-medium">
                Mandatory step to authenticate your application before digital signature
              </p>
            </div>
          </div>
          {verificationStep === "VERIFIED" && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" /> Email Verified
            </Badge>
          )}
        </div>

        {/* STEP 1: ENTER EMAIL & SEND CODE */}
        {verificationStep === "ENTER_EMAIL" && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-black">
                A
              </span>
              <span>Verify your application email address by requesting a 6-digit security code:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="e.g. customer@example.com"
                disabled={sendingOtp}
                className="rounded-xl h-12 text-sm bg-white flex-1 border-slate-300 font-medium"
              />
              <Button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !email.trim() || cooldown > 0}
                className="rounded-xl h-12 px-6 text-xs font-bold shrink-0 bg-primary hover:bg-primary/90 text-white shadow-sm cursor-pointer"
              >
                {sendingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending Code…
                  </>
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </div>

            {otpError && (
              <div className="flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{otpError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: ENTER OTP CODE */}
        {verificationStep === "ENTER_OTP" && (
          <div className="space-y-4 bg-white p-5 rounded-xl border-2 border-primary/20 shadow-sm animate-in fade-in-50 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-black">
                  B
                </span>
                <KeyRound className="h-4 w-4 text-primary" />
                <span>Verification Code</span>
              </div>
              <button
                type="button"
                onClick={handleChangeEmailClick}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto"
              >
                Change Email
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-600">
                We sent a 6-digit verification code to:
              </p>
              <p className="text-sm font-bold text-slate-900 font-mono bg-slate-100 px-3 py-1 rounded-lg inline-block border border-slate-200">
                {otpSentTo || email}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <div className="relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setOtpError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (otpCode.trim().length === 6) handleVerifyOtp();
                    }
                  }}
                  placeholder="_ _ _ _ _ _"
                  className="rounded-xl h-12 text-center font-mono text-xl font-black tracking-[0.35em] w-full sm:w-56 bg-slate-50 border-slate-300 focus:bg-white focus:border-primary"
                  autoFocus
                />
              </div>

              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpCode.trim().length !== 6}
                className="rounded-xl h-12 px-6 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-sm cursor-pointer"
              >
                {verifyingOtp ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Verify Email
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleResendOtp}
                disabled={sendingOtp || cooldown > 0}
                className="rounded-xl h-12 px-4 text-xs font-bold border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
              >
                <RotateCcw className={cn("h-3.5 w-3.5 mr-1.5", sendingOtp && "animate-spin")} />
                {sendingOtp
                  ? "Sending…"
                  : cooldown > 0
                    ? `Resend Code (${cooldown}s)`
                    : "Resend Code"}
              </Button>
            </div>

            {otpError && (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{otpError}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: VERIFIED STATE */}
        {verificationStep === "VERIFIED" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  ✓ Email verified
                </p>
                <p className="text-xs text-emerald-800">
                  Authenticated: <span className="font-mono font-bold text-emerald-900">{verifiedEmail}</span>
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleChangeEmailClick}
              className="text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 border-emerald-300 h-9 px-4 rounded-xl font-bold self-start sm:self-auto cursor-pointer"
            >
              Change Email
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 7: DIGITAL SIGNATURE PAD */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
              7
            </span>
            <PenTool className="h-4 w-4 text-primary" /> Customer Digital Signature *
          </h3>
          {hasSigned && (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              ✓ Signature Captured
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-600">
            Please sign below using your finger, stylus, mouse, or trackpad. This digital signature serves as legal confirmation for your official Calor Gas customer account.
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            Signatory: <span className="font-bold text-slate-700">{fullName || "Applicant"}</span> • Date: <span className="font-mono text-slate-700">{new Date().toLocaleDateString("en-GB")}</span>
          </p>
        </div>

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
            className="w-full h-40 sm:h-48 touch-none cursor-crosshair bg-slate-50/40"
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
      {/* SECTION 8: FINAL SUBMIT ACTION */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto rounded-full px-6 py-2.5 h-12 font-bold text-slate-700"
          >
            Cancel
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Info className="h-4 w-4 text-slate-400" />
            <span>Applications are reviewed promptly by our Whitminster office.</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto rounded-full px-9 py-3 bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer h-12"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Submitting Application...</span>
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
