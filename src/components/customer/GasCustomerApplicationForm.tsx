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
  Upload,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  ArrowRight,
  ArrowLeft,
  SlidersHorizontal,
  Users,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  submitGasCustomerApplication,
  getCustomerGasApplication,
  sendApplicationEmailOtp,
  verifyApplicationEmailOtp,
  GasCustomerApplication,
} from "@/lib/application-service";
import {
  saveLocalDraft,
  saveBackendDraft,
  loadLatestDraft,
  clearAllDrafts,
  GasApplicationDraft,
} from "@/lib/application-draft-service";
import {
  normalizeAccountNumber,
  isValidAccountNumberFormat,
} from "@/lib/account-number-service";
import { CustomerAccountNumberBadge } from "@/components/customer/CustomerAccountNumberBadge";
import { ConditionsOfUseContent } from "@/components/site/ConditionsOfUseContent";

// ============================================================================
// SECTION 4 DEFINITIONS: GAS TYPES & CYLINDER MAPPINGS
// ============================================================================
const GAS_TYPES_LIST = [
  {
    id: "Propane LPG (Red Bottles - 37mbar POL)",
    label: "Propane Gas (LPG)",
    badge: "Red Bottles",
    detail: "Red Bottles • 37mbar POL • Home Heating, Cooking & Outdoor",
    accent: "border-red-200/80 bg-red-50/40 text-red-950",
  },
  {
    id: "Butane Gas (Blue Bottles - 28mbar 21mm)",
    label: "Butane Gas",
    badge: "Blue Bottles",
    detail: "Blue Bottles • 28mbar Clip • Indoor Portable Heaters & Caravans",
    accent: "border-blue-200/80 bg-blue-50/40 text-blue-950",
  },
  {
    id: "Patio Gas (Green Bottles - 27mm Clip-on)",
    label: "Patio Gas / BBQ",
    badge: "Green Bottles",
    detail: "Green Bottles • 27mm Clip • Patio Heaters, BBQs & Pizza Ovens",
    accent: "border-emerald-200/80 bg-emerald-50/40 text-emerald-950",
  },
  {
    id: "Forklift FLT Gas (Liquid Offtake)",
    label: "Forklift Gas (FLT)",
    badge: "Red Cylinders",
    detail: "Red Cylinders • Liquid Offtake • Warehouse & Industrial Forklifts",
    accent: "border-amber-200/80 bg-amber-50/40 text-amber-950",
  },
  {
    id: "Cellar & Beverage Dispense Gas (CO2 / Mixed)",
    label: "Cellar & Dispense Gas",
    badge: "Air Liquide CO2",
    detail: "Air Liquide CO2 & Mixed Gas • Pub Draught Line Dispense",
    accent: "border-purple-200/80 bg-purple-50/40 text-purple-950",
  },
  {
    id: "Autogas (Vehicle LPG Refuelling)",
    label: "Automotive Autogas",
    badge: "Road LPG",
    detail: "Road LPG Fuel • Vehicle Refuelling & Adapters",
    accent: "border-sky-200/80 bg-sky-50/40 text-sky-950",
  },
  {
    id: "Solid Fuel & Kiln Dried Logs",
    label: "Solid Fuel & Firewood",
    badge: "Hardwood & Coal",
    detail: "Kiln Dried Hardwood Logs, Smokeless Coal & Kindling",
    accent: "border-stone-200/80 bg-stone-50/40 text-stone-950",
  },
];

const ALL_CYLINDER_SIZES = [
  {
    id: "47kg Propane (Heavy Commercial)",
    label: "47kg Propane",
    desc: "Heavy Heating / 2-4 Bank",
    category: "Propane LPG",
    gasTypeIds: ["Propane LPG (Red Bottles - 37mbar POL)"],
  },
  {
    id: "19kg Propane (Catering/Trade)",
    label: "19kg Propane",
    desc: "Catering & Roofing",
    category: "Propane LPG",
    gasTypeIds: ["Propane LPG (Red Bottles - 37mbar POL)"],
  },
  {
    id: "13kg Propane (Domestic Heating & Cooking)",
    label: "13kg Propane",
    desc: "Domestic Ranges",
    category: "Propane LPG",
    gasTypeIds: ["Propane LPG (Red Bottles - 37mbar POL)"],
  },
  {
    id: "6kg / 3.9kg Propane (Caravans)",
    label: "6kg Propane",
    desc: "Caravans & Boats",
    category: "Propane LPG",
    gasTypeIds: ["Propane LPG (Red Bottles - 37mbar POL)"],
  },
  {
    id: "18kg FLT (Forklift Offtake)",
    label: "18kg FLT",
    desc: "Forklift Trucks",
    category: "Forklift Gas",
    gasTypeIds: ["Forklift FLT Gas (Liquid Offtake)"],
  },
  {
    id: "15kg Butane (Indoor Heaters)",
    label: "15kg Butane",
    desc: "Indoor Portable",
    category: "Butane Gas",
    gasTypeIds: ["Butane Gas (Blue Bottles - 28mbar 21mm)"],
  },
  {
    id: "7kg Butane (Caravans)",
    label: "7kg Butane",
    desc: "Compact Indoor",
    category: "Butane Gas",
    gasTypeIds: ["Butane Gas (Blue Bottles - 28mbar 21mm)"],
  },
  {
    id: "13kg Patio Gas (BBQ & Patio Heaters)",
    label: "13kg Patio",
    desc: "Large BBQ / Heaters",
    category: "Patio Gas",
    gasTypeIds: ["Patio Gas (Green Bottles - 27mm Clip-on)"],
  },
  {
    id: "5kg Patio Gas (Compact BBQ)",
    label: "5kg Patio",
    desc: "Compact BBQ",
    category: "Patio Gas",
    gasTypeIds: ["Patio Gas (Green Bottles - 27mm Clip-on)"],
  },
  {
    id: "Bulk Propane / Autogas",
    label: "Bulk / Autogas",
    desc: "Bulk Road Delivery",
    category: "Bulk / Road LPG",
    gasTypeIds: [
      "Autogas (Vehicle LPG Refuelling)",
      "Propane LPG (Red Bottles - 37mbar POL)",
      "Cellar & Beverage Dispense Gas (CO2 / Mixed)",
      "Solid Fuel & Kiln Dried Logs",
    ],
  },
];

function getAvailableCylinderSizes(selectedGas: string[]) {
  if (!selectedGas || selectedGas.length === 0) return ALL_CYLINDER_SIZES;
  const filtered = ALL_CYLINDER_SIZES.filter((sz) =>
    sz.gasTypeIds.some((gid) => selectedGas.includes(gid)),
  );
  return filtered.length > 0 ? filtered : ALL_CYLINDER_SIZES;
}

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
  const [activeCustomerId, setActiveCustomerId] = useState<string>(user?.id || "");
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const hasRestoredDraftRef = useRef(false);
  const isRestoringRef = useRef(false);
  const loadedCustomerIdRef = useRef<string | null>(null);
  const baselineSnapshotRef = useRef<string | null>(null);

  // =========================================================================
  // SECTION 1: CUSTOMER PERSONAL DETAILS (Always start blank for new users)
  // =========================================================================
  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("Phone");

  // =========================================================================
  // SECTION 2: DELIVERY & SITE INFORMATION
  // =========================================================================
  const [houseNumberOrName, setHouseNumberOrName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [postcode, setPostcode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [hasDifferentDelivery, setHasDifferentDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [hasDifferentBilling, setHasDifferentBilling] = useState(false);
  const [billingAddress, setBillingAddress] = useState("");

  // =========================================================================
  // SECTION 3: GAS USAGE & CUSTOMER CLASSIFICATION
  // =========================================================================
  const [customerType, setCustomerType] = useState<"HOME" | "BUSINESS">(
    initialUsage === "COMMERCIAL" || initialUsage === "BULK" ? "BUSINESS" : "HOME",
  );
  const [hasPreviousPurchases, setHasPreviousPurchases] = useState(false);
  const [previousAccountDetails, setPreviousAccountDetails] = useState("");
  const [knowsAccountNumber, setKnowsAccountNumber] = useState<boolean | null>(null);

  const [selectedUsages, setSelectedUsages] = useState<Array<"DOMESTIC" | "COMMERCIAL" | "BULK" | "AUTOGAS">>([
    initialUsage || "DOMESTIC",
  ]);
  const [estimatedConsumption, setEstimatedConsumption] = useState(
    "1 - 2 Cylinders / Month (Domestic Heating/Cooking)",
  );
  const [primaryAppliances, setPrimaryAppliances] = useState<string[]>([]);
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
  const [selectedGasTypes, setSelectedGasTypes] = useState<string[]>([]);
  const [selectedCylinderSizes, setSelectedCylinderSizes] = useState<string[]>([]);
  const [isCylinderModalOpen, setIsCylinderModalOpen] = useState(false);
  const [hasConfirmedCylinderSizes, setHasConfirmedCylinderSizes] = useState(false);
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
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

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
  const [otpCooldownEndsAt, setOtpCooldownEndsAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const cooldown = otpCooldownEndsAt
    ? Math.max(0, Math.ceil((otpCooldownEndsAt - nowTick) / 1000))
    : 0;

  // =========================================================================
  // SECTION 7: CUSTOMER DIGITAL SIGNATURE
  // =========================================================================
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const emailSectionRef = useRef<HTMLDivElement | null>(null);

  // Digital Signature Mode: "draw" | "upload"
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");
  const [uploadedSignatureData, setUploadedSignatureData] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawnSignatureRef = useRef<string | null>(null);

  const resetFormToBlank = () => {
    setTitle("");
    setFullName("");
    setDateOfBirth("");
    setPhone("");
    setAltPhone("");
    setEmail("");
    setPreferredContactMethod("Phone");
    setHouseNumberOrName("");
    setStreetAddress("");
    setCity("");
    setCounty("");
    setPostcode("");
    setDeliveryNotes("");
    setHasDifferentDelivery(false);
    setDeliveryAddress("");
    setHasDifferentBilling(false);
    setBillingAddress("");
    setCustomerType(initialUsage === "COMMERCIAL" || initialUsage === "BULK" ? "BUSINESS" : "HOME");
    setHasPreviousPurchases(false);
    setPreviousAccountDetails("");
    setKnowsAccountNumber(null);
    setSelectedUsages([initialUsage || "DOMESTIC"]);
    setEstimatedConsumption("1 - 2 Cylinders / Month (Domestic Heating/Cooking)");
    setPrimaryAppliances([]);
    setBusinessName("");
    setTradingName("");
    setCompanyRegOrVat("");
    setBusinessType("Hospitality / Catering");
    setBusinessAddress("");
    setBusinessContact("");
    setSelectedGasTypes([]);
    setSelectedCylinderSizes([]);
    setHasConfirmedCylinderSizes(false);
    setExistingCylinderStatus("New Customer (No Existing Cylinders)");
    setInitialQuantity("2 Cylinders (1 Active + 1 Reserve Bank)");
    setStorageLocation("Outdoor Ventilated Hardstanding / Solid Plinth");
    setRegulatorType("Automatic Changeover Valve (Dual Bottle 2-Pack)");
    setDeclarationAccepted(false);
    setStorageConfirmed(false);
    setVerificationStep("ENTER_EMAIL");
    setOtpSentTo("");
    setOtpCode("");
    setVerifiedEmail(null);
    setOtpError(null);
    setOtpCooldownEndsAt(null);
    setHasSigned(false);
    setUploadedSignatureData(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setDraftStatus("idle");
    setLastSavedTime(null);
  };

  const buildSnapshot = (draft: Omit<GasApplicationDraft, "updatedAt">) => JSON.stringify(draft);

  // Resolve active authenticated customer ID & reset stale state on account switch/logout
  useEffect(() => {
    if (user?.id) {
      if (loadedCustomerIdRef.current && loadedCustomerIdRef.current !== user.id) {
        hasRestoredDraftRef.current = false;
        baselineSnapshotRef.current = null;
        resetFormToBlank();
      }
      setActiveCustomerId(user.id);
      return;
    }

    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const uid = data?.user?.id || "";
      if (!uid) {
        hasRestoredDraftRef.current = false;
        loadedCustomerIdRef.current = null;
        baselineSnapshotRef.current = null;
        resetFormToBlank();
      } else if (loadedCustomerIdRef.current && loadedCustomerIdRef.current !== uid) {
        hasRestoredDraftRef.current = false;
        baselineSnapshotRef.current = null;
        resetFormToBlank();
      }
      setActiveCustomerId(uid);
    });
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Restore latest application draft (or detect already-submitted application)
  useEffect(() => {
    if (!activeCustomerId) return;
    if (hasRestoredDraftRef.current && loadedCustomerIdRef.current === activeCustomerId) return;

    let isCancelled = false;

    async function restoreDraft() {
      isRestoringRef.current = true;
      loadedCustomerIdRef.current = activeCustomerId;
      resetFormToBlank();
      try {
        // If the customer already has an active, submitted application, do not show draft
        const existingApp = await getCustomerGasApplication(activeCustomerId).catch(() => null);
        if (
          existingApp &&
          existingApp.status &&
          existingApp.status !== "NOT_COMPLETED" &&
          !onCancel
        ) {
          await clearAllDrafts(activeCustomerId).catch(() => {});
          if (!isCancelled && onSuccess) {
            onSuccess(existingApp);
            return;
          }
        }

        const draft = await loadLatestDraft(activeCustomerId);
        if (draft && !isCancelled) {
          // Section 1: Personal Details
          if (draft.title !== undefined) setTitle(draft.title);
          if (draft.fullName !== undefined) setFullName(draft.fullName);
          if (draft.dateOfBirth !== undefined) setDateOfBirth(draft.dateOfBirth);
          if (draft.phone !== undefined) setPhone(draft.phone);
          if (draft.altPhone !== undefined) setAltPhone(draft.altPhone);
          if (draft.email !== undefined) setEmail(draft.email);
          if (draft.preferredContactMethod !== undefined)
            setPreferredContactMethod(draft.preferredContactMethod);

          // Section 2: Delivery & Site Information
          if (draft.houseNumberOrName !== undefined)
            setHouseNumberOrName(draft.houseNumberOrName);
          if (draft.streetAddress !== undefined) setStreetAddress(draft.streetAddress);
          if (draft.city !== undefined) setCity(draft.city);
          if (draft.county !== undefined) setCounty(draft.county);
          if (draft.postcode !== undefined) setPostcode(draft.postcode);
          if (draft.deliveryNotes !== undefined) setDeliveryNotes(draft.deliveryNotes);
          if (draft.hasDifferentDelivery !== undefined)
            setHasDifferentDelivery(draft.hasDifferentDelivery);
          if (draft.deliveryAddress !== undefined) setDeliveryAddress(draft.deliveryAddress);
          if (draft.hasDifferentBilling !== undefined)
            setHasDifferentBilling(draft.hasDifferentBilling);
          if (draft.billingAddress !== undefined) setBillingAddress(draft.billingAddress);

          // Section 3: Gas Usage & Customer Classification
          if (draft.customerType !== undefined) setCustomerType(draft.customerType);
          if (draft.hasPreviousPurchases !== undefined)
            setHasPreviousPurchases(draft.hasPreviousPurchases);
          if (draft.previousAccountDetails !== undefined)
            setPreviousAccountDetails(draft.previousAccountDetails);
          if (draft.knowsAccountNumber !== undefined)
            setKnowsAccountNumber(draft.knowsAccountNumber);
          if (draft.selectedUsages !== undefined && Array.isArray(draft.selectedUsages))
            setSelectedUsages(draft.selectedUsages);
          if (draft.estimatedConsumption !== undefined)
            setEstimatedConsumption(draft.estimatedConsumption);
          if (draft.primaryAppliances !== undefined && Array.isArray(draft.primaryAppliances))
            setPrimaryAppliances(draft.primaryAppliances);
          if (draft.businessName !== undefined) setBusinessName(draft.businessName);
          if (draft.tradingName !== undefined) setTradingName(draft.tradingName);
          if (draft.companyRegOrVat !== undefined) setCompanyRegOrVat(draft.companyRegOrVat);
          if (draft.businessType !== undefined) setBusinessType(draft.businessType);
          if (draft.businessAddress !== undefined) setBusinessAddress(draft.businessAddress);
          if (draft.businessContact !== undefined) setBusinessContact(draft.businessContact);

          // Section 4: Gas & Cylinder Requirements
          if (draft.selectedGasTypes !== undefined && Array.isArray(draft.selectedGasTypes))
            setSelectedGasTypes(draft.selectedGasTypes);
          if (
            draft.selectedCylinderSizes !== undefined &&
            Array.isArray(draft.selectedCylinderSizes)
          )
            setSelectedCylinderSizes(draft.selectedCylinderSizes);
          if (draft.hasConfirmedCylinderSizes !== undefined)
            setHasConfirmedCylinderSizes(draft.hasConfirmedCylinderSizes);
          if (draft.existingCylinderStatus !== undefined)
            setExistingCylinderStatus(draft.existingCylinderStatus);
          if (draft.initialQuantity !== undefined)
            setInitialQuantity(draft.initialQuantity);
          if (draft.storageLocation !== undefined)
            setStorageLocation(draft.storageLocation);
          if (draft.regulatorType !== undefined) setRegulatorType(draft.regulatorType);

          // Section 5: Safety Compliance & Agreement
          if (draft.declarationAccepted !== undefined)
            setDeclarationAccepted(draft.declarationAccepted);
          if (draft.storageConfirmed !== undefined)
            setStorageConfirmed(draft.storageConfirmed);

          // Section 6: Verification session & cooldown timestamp (persists across refresh/app switch)
          if (
            draft.verifiedEmail &&
            draft.email &&
            draft.verifiedEmail.trim().toLowerCase() === draft.email.trim().toLowerCase()
          ) {
            setVerifiedEmail(draft.verifiedEmail);
            setVerificationStep("VERIFIED");
            setOtpSentTo(draft.verifiedEmail);
          } else if (draft.verificationStep === "ENTER_OTP" && draft.otpSentTo) {
            setVerificationStep("ENTER_OTP");
            setOtpSentTo(draft.otpSentTo);
          }

          if (typeof draft.otpCooldownEndsAt === "number" && draft.otpCooldownEndsAt > Date.now()) {
            setOtpCooldownEndsAt(draft.otpCooldownEndsAt);
            setNowTick(Date.now());
          }

          setDraftStatus("saved");
          if (draft.updatedAt) {
            try {
              const d = new Date(draft.updatedAt);
              setLastSavedTime(
                d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              );
            } catch {
              setLastSavedTime(null);
            }
          }
          const { updatedAt: _u, ...restoredWithoutTs } = draft;
          baselineSnapshotRef.current = buildSnapshot({
            customerId: activeCustomerId,
            title: restoredWithoutTs.title ?? "",
            fullName: restoredWithoutTs.fullName ?? "",
            dateOfBirth: restoredWithoutTs.dateOfBirth ?? "",
            phone: restoredWithoutTs.phone ?? "",
            altPhone: restoredWithoutTs.altPhone ?? "",
            email: restoredWithoutTs.email ?? "",
            preferredContactMethod: restoredWithoutTs.preferredContactMethod ?? "Phone",
            houseNumberOrName: restoredWithoutTs.houseNumberOrName ?? "",
            streetAddress: restoredWithoutTs.streetAddress ?? "",
            city: restoredWithoutTs.city ?? "",
            county: restoredWithoutTs.county ?? "",
            postcode: restoredWithoutTs.postcode ?? "",
            deliveryNotes: restoredWithoutTs.deliveryNotes ?? "",
            hasDifferentDelivery: restoredWithoutTs.hasDifferentDelivery ?? false,
            deliveryAddress: restoredWithoutTs.deliveryAddress ?? "",
            hasDifferentBilling: restoredWithoutTs.hasDifferentBilling ?? false,
            billingAddress: restoredWithoutTs.billingAddress ?? "",
            customerType:
              restoredWithoutTs.customerType ??
              (initialUsage === "COMMERCIAL" || initialUsage === "BULK" ? "BUSINESS" : "HOME"),
            hasPreviousPurchases: restoredWithoutTs.hasPreviousPurchases ?? false,
            previousAccountDetails: restoredWithoutTs.previousAccountDetails ?? "",
            knowsAccountNumber: restoredWithoutTs.knowsAccountNumber ?? null,
            selectedUsages: restoredWithoutTs.selectedUsages ?? [initialUsage || "DOMESTIC"],
            estimatedConsumption:
              restoredWithoutTs.estimatedConsumption ??
              "1 - 2 Cylinders / Month (Domestic Heating/Cooking)",
            primaryAppliances: restoredWithoutTs.primaryAppliances ?? [],
            businessName: restoredWithoutTs.businessName ?? "",
            tradingName: restoredWithoutTs.tradingName ?? "",
            companyRegOrVat: restoredWithoutTs.companyRegOrVat ?? "",
            businessType: restoredWithoutTs.businessType ?? "Hospitality / Catering",
            businessAddress: restoredWithoutTs.businessAddress ?? "",
            businessContact: restoredWithoutTs.businessContact ?? "",
            selectedGasTypes: restoredWithoutTs.selectedGasTypes ?? [],
            selectedCylinderSizes: restoredWithoutTs.selectedCylinderSizes ?? [],
            hasConfirmedCylinderSizes: restoredWithoutTs.hasConfirmedCylinderSizes ?? false,
            existingCylinderStatus:
              restoredWithoutTs.existingCylinderStatus ?? "New Customer (No Existing Cylinders)",
            initialQuantity:
              restoredWithoutTs.initialQuantity ?? "2 Cylinders (1 Active + 1 Reserve Bank)",
            storageLocation:
              restoredWithoutTs.storageLocation ??
              "Outdoor Ventilated Hardstanding / Solid Plinth",
            regulatorType:
              restoredWithoutTs.regulatorType ?? "Automatic Changeover Valve (Dual Bottle 2-Pack)",
            declarationAccepted: restoredWithoutTs.declarationAccepted ?? false,
            storageConfirmed: restoredWithoutTs.storageConfirmed ?? false,
            verifiedEmail:
              restoredWithoutTs.verifiedEmail &&
              restoredWithoutTs.email &&
              restoredWithoutTs.verifiedEmail.trim().toLowerCase() ===
                restoredWithoutTs.email.trim().toLowerCase()
                ? restoredWithoutTs.verifiedEmail
                : null,
            verificationStep:
              restoredWithoutTs.verifiedEmail &&
              restoredWithoutTs.email &&
              restoredWithoutTs.verifiedEmail.trim().toLowerCase() ===
                restoredWithoutTs.email.trim().toLowerCase()
                ? "VERIFIED"
                : restoredWithoutTs.verificationStep === "ENTER_OTP" && restoredWithoutTs.otpSentTo
                  ? "ENTER_OTP"
                  : "ENTER_EMAIL",
            otpSentTo: restoredWithoutTs.otpSentTo ?? "",
            otpCooldownEndsAt:
              typeof restoredWithoutTs.otpCooldownEndsAt === "number" &&
              restoredWithoutTs.otpCooldownEndsAt > Date.now()
                ? restoredWithoutTs.otpCooldownEndsAt
                : null,
          });
        } else if (!isCancelled) {
          // Brand new customer with no saved draft: record blank baseline so empty state is never auto-saved
          baselineSnapshotRef.current = buildSnapshot({
            customerId: activeCustomerId,
            title: "",
            fullName: "",
            dateOfBirth: "",
            phone: "",
            altPhone: "",
            email: "",
            preferredContactMethod: "Phone",
            houseNumberOrName: "",
            streetAddress: "",
            city: "",
            county: "",
            postcode: "",
            deliveryNotes: "",
            hasDifferentDelivery: false,
            deliveryAddress: "",
            hasDifferentBilling: false,
            billingAddress: "",
            customerType:
              initialUsage === "COMMERCIAL" || initialUsage === "BULK" ? "BUSINESS" : "HOME",
            hasPreviousPurchases: false,
            previousAccountDetails: "",
            knowsAccountNumber: null,
            selectedUsages: [initialUsage || "DOMESTIC"],
            estimatedConsumption: "1 - 2 Cylinders / Month (Domestic Heating/Cooking)",
            primaryAppliances: [],
            businessName: "",
            tradingName: "",
            companyRegOrVat: "",
            businessType: "Hospitality / Catering",
            businessAddress: "",
            businessContact: "",
            selectedGasTypes: [],
            selectedCylinderSizes: [],
            hasConfirmedCylinderSizes: false,
            existingCylinderStatus: "New Customer (No Existing Cylinders)",
            initialQuantity: "2 Cylinders (1 Active + 1 Reserve Bank)",
            storageLocation: "Outdoor Ventilated Hardstanding / Solid Plinth",
            regulatorType: "Automatic Changeover Valve (Dual Bottle 2-Pack)",
            declarationAccepted: false,
            storageConfirmed: false,
            verifiedEmail: null,
            verificationStep: "ENTER_EMAIL",
            otpSentTo: "",
            otpCooldownEndsAt: null,
          });
        }
      } finally {
        if (!isCancelled) {
          hasRestoredDraftRef.current = true;
          isRestoringRef.current = false;
        }
      }
    }

    restoreDraft();

    return () => {
      isCancelled = true;
    };
  }, [activeCustomerId, onCancel, onSuccess]);

  // Automatic Draft Saving: Persists locally immediately & debounces backend sync
  useEffect(() => {
    if (
      !activeCustomerId ||
      !hasRestoredDraftRef.current ||
      isRestoringRef.current ||
      loadedCustomerIdRef.current !== activeCustomerId
    ) {
      return;
    }

    const draftCore: Omit<GasApplicationDraft, "updatedAt"> = {
      customerId: activeCustomerId,
      // Section 1
      title,
      fullName,
      dateOfBirth,
      phone,
      altPhone,
      email,
      preferredContactMethod,
      // Section 2
      houseNumberOrName,
      streetAddress,
      city,
      county,
      postcode,
      deliveryNotes,
      hasDifferentDelivery,
      deliveryAddress,
      hasDifferentBilling,
      billingAddress,
      // Section 3
      customerType,
      hasPreviousPurchases,
      previousAccountDetails,
      knowsAccountNumber,
      selectedUsages,
      estimatedConsumption,
      primaryAppliances,
      businessName,
      tradingName,
      companyRegOrVat,
      businessType,
      businessAddress,
      businessContact,
      // Section 4
      selectedGasTypes,
      selectedCylinderSizes,
      hasConfirmedCylinderSizes,
      existingCylinderStatus,
      initialQuantity,
      storageLocation,
      regulatorType,
      // Section 5
      declarationAccepted,
      storageConfirmed,
      // Section 6 (only store verifiedEmail if verifiedEmail matches current email)
      verifiedEmail:
        verifiedEmail && verifiedEmail.trim().toLowerCase() === email.trim().toLowerCase()
          ? verifiedEmail
          : null,
      verificationStep,
      otpSentTo,
      otpCooldownEndsAt:
        otpCooldownEndsAt && otpCooldownEndsAt > Date.now() ? otpCooldownEndsAt : null,
    };

    const currentSnapshot = buildSnapshot(draftCore);
    if (baselineSnapshotRef.current !== null && currentSnapshot === baselineSnapshotRef.current) {
      return;
    }
    baselineSnapshotRef.current = null;

    const draftData: GasApplicationDraft = {
      ...draftCore,
      updatedAt: new Date().toISOString(),
    };

    // Save immediately to isolated local storage
    saveLocalDraft(activeCustomerId, draftData);
    setDraftStatus("saving");

    // Debounce save to Supabase backend (800ms)
    const timer = setTimeout(async () => {
      try {
        await saveBackendDraft(activeCustomerId, draftData);
      } catch (err) {
        console.warn("Backend draft save failed, local draft remains intact:", err);
      } finally {
        setDraftStatus("saved");
        const now = new Date();
        setLastSavedTime(
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        );
      }
    }, 800);

    return () => {
      clearTimeout(timer);
    };
  }, [
    activeCustomerId,
    title,
    fullName,
    dateOfBirth,
    phone,
    altPhone,
    email,
    preferredContactMethod,
    houseNumberOrName,
    streetAddress,
    city,
    county,
    postcode,
    deliveryNotes,
    hasDifferentDelivery,
    deliveryAddress,
    hasDifferentBilling,
    billingAddress,
    customerType,
    hasPreviousPurchases,
    previousAccountDetails,
    knowsAccountNumber,
    selectedUsages,
    estimatedConsumption,
    primaryAppliances,
    businessName,
    tradingName,
    companyRegOrVat,
    businessType,
    businessAddress,
    businessContact,
    selectedGasTypes,
    selectedCylinderSizes,
    hasConfirmedCylinderSizes,
    existingCylinderStatus,
    initialQuantity,
    storageLocation,
    regulatorType,
    declarationAccepted,
    storageConfirmed,
    verifiedEmail,
    verificationStep,
    otpSentTo,
    otpCooldownEndsAt,
  ]);

  // Timestamp-based 60s countdown timer that stays accurate across mobile/desktop app switching
  useEffect(() => {
    if (!otpCooldownEndsAt) return;

    const syncNow = () => {
      const now = Date.now();
      setNowTick(now);
      if (now >= otpCooldownEndsAt) {
        setOtpCooldownEndsAt(null);
      }
    };

    syncNow();
    const timer = setInterval(syncNow, 1000);
    const handleVisibilityOrFocus = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        syncNow();
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleVisibilityOrFocus);
      document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleVisibilityOrFocus);
        document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      }
    };
  }, [otpCooldownEndsAt]);

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
    if (cooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    setOtpError(null);
    try {
      const res = await sendApplicationEmailOtp(cleanEmail);
      setOtpSentTo(cleanEmail);
      setVerificationStep("ENTER_OTP");
      setOtpCooldownEndsAt(res.cooldownEndsAt ?? Date.now() + 60_000);
      setNowTick(Date.now());
      setOtpCode("");
      toast.success(res.message || `Verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      const msg = err.message || "Failed to send verification code. Please try again.";
      setOtpError(msg);
      toast.error(msg);
      if (typeof err?.cooldownEndsAt === "number" && err.cooldownEndsAt > Date.now()) {
        setOtpCooldownEndsAt(err.cooldownEndsAt);
        setNowTick(Date.now());
        setOtpSentTo(cleanEmail);
        setVerificationStep("ENTER_OTP");
      } else {
        setVerificationStep("ENTER_EMAIL");
      }
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
      setOtpCooldownEndsAt(res.cooldownEndsAt ?? Date.now() + 60_000);
      setNowTick(Date.now());
      setOtpCode("");
      toast.success(`A fresh 6-digit code was sent to ${targetEmail}`);
    } catch (err: any) {
      const msg = err.message || "Failed to resend verification code. Please try again.";
      setOtpError(msg);
      toast.error(msg);
      if (typeof err?.cooldownEndsAt === "number" && err.cooldownEndsAt > Date.now()) {
        setOtpCooldownEndsAt(err.cooldownEndsAt);
        setNowTick(Date.now());
      }
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
      prev.includes(gasName) ? prev.filter((g) => g !== gasName) : [...prev, gasName],
    );
  };

  const toggleCylinderSize = (sizeName: string) => {
    setSelectedCylinderSizes((prev) =>
      prev.includes(sizeName) ? prev.filter((s) => s !== sizeName) : [...prev, sizeName],
    );
  };

  // Synchronize available cylinder sizes when gas type selection changes
  useEffect(() => {
    if (selectedGasTypes.length === 0) {
      setSelectedCylinderSizes([]);
      setHasConfirmedCylinderSizes(false);
      return;
    }
    const available = getAvailableCylinderSizes(selectedGasTypes);
    const availableIds = new Set(available.map((a) => a.id));
    setSelectedCylinderSizes((prev) => {
      const valid = prev.filter((id) => availableIds.has(id));
      if (valid.length === 0 && prev.length > 0) {
        setHasConfirmedCylinderSizes(false);
      }
      return valid;
    });
  }, [selectedGasTypes]);

  const toggleAppliance = (applianceName: string) => {
    setPrimaryAppliances((prev) =>
      prev.includes(applianceName)
        ? prev.filter((item) => item !== applianceName)
        : [...prev, applianceName],
    );
  };

  const isCommercialOrBulk =
    customerType === "BUSINESS" ||
    selectedUsages.includes("COMMERCIAL") ||
    selectedUsages.includes("BULK");

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
    if (canvasRef.current) {
      drawnSignatureRef.current = canvasRef.current.toDataURL("image/png");
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    drawnSignatureRef.current = null;
  };

  // =========================================================================
  // UPLOAD SIGNATURE UTILITIES & HANDLERS
  // =========================================================================
  const MAX_SIGNATURE_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
  const ALLOWED_SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processUploadedFile = (file: File) => {
    setUploadError(null);

    // 1. Validate file extension and MIME type
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowedExt = ext === "png" || ext === "jpg" || ext === "jpeg";
    const isAllowedMime = ALLOWED_SIGNATURE_TYPES.includes(file.type.toLowerCase());

    if (!isAllowedExt && !isAllowedMime) {
      const err = "Unsupported file format. Please upload a PNG, JPG, or JPEG signature image.";
      setUploadError(err);
      toast.error(err);
      return;
    }

    // 2. Validate file size (max 2 MB)
    if (file.size > MAX_SIGNATURE_FILE_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const err = `File size (${sizeMb} MB) exceeds the 2 MB limit. Please choose a smaller image.`;
      setUploadError(err);
      toast.error(err);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) {
        setUploadError("Could not read image file. Please try again.");
        toast.error("Could not read image file.");
        return;
      }

      // 3. Decode & normalize signature image
      const img = new Image();
      img.onload = () => {
        try {
          const offCanvas = document.createElement("canvas");
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          offCanvas.width = width;
          offCanvas.height = height;
          const ctx = offCanvas.getContext("2d");
          if (!ctx) {
            setUploadedSignatureData(rawDataUrl);
            setUploadedFileName(file.name);
            setUploadedFileSize(file.size);
            setUploadError(null);
            toast.success("✓ Signature image uploaded successfully!");
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
          const normalized = offCanvas.toDataURL(mime, 0.92);

          setUploadedSignatureData(normalized);
          setUploadedFileName(file.name);
          setUploadedFileSize(file.size);
          setUploadError(null);
          toast.success("✓ Signature image uploaded successfully!");
        } catch {
          setUploadedSignatureData(rawDataUrl);
          setUploadedFileName(file.name);
          setUploadedFileSize(file.size);
          setUploadError(null);
          toast.success("✓ Signature image uploaded successfully!");
        }
      };

      img.onerror = () => {
        setUploadError("Invalid or corrupted image file. Please upload a valid PNG or JPG.");
        toast.error("Invalid image file.");
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      setUploadError("Error reading the image file.");
      toast.error("Error reading file.");
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleRemoveUploadedSignature = () => {
    setUploadedSignatureData(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.info("Uploaded signature removed.");
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

    if (selectedGasTypes.length === 0) {
      return toast.error("Please select at least one gas type requirement in Section 4.");
    }

    if (selectedCylinderSizes.length === 0) {
      setIsCylinderModalOpen(true);
      return toast.error("Please select your cylinder size requirements in Section 4.");
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

    // Determine final signature based on active mode
    let finalSignatureData = "";
    if (signatureMode === "draw") {
      if (!hasSigned || !canvasRef.current) {
        if (uploadedSignatureData) {
          return toast.error("You have an uploaded signature. Switch to the 'Upload Signature' tab or draw your signature here.");
        }
        return toast.error("Please provide your digital signature in Section 7 before submitting.");
      }
      finalSignatureData = canvasRef.current.toDataURL("image/png");
    } else {
      if (!uploadedSignatureData) {
        if (hasSigned) {
          return toast.error("You have a drawn signature. Switch to the 'Draw Signature' tab or upload an image here.");
        }
        return toast.error("Please upload your signature image in Section 7 before submitting.");
      }
      finalSignatureData = uploadedSignatureData;
    }

    if (!finalSignatureData || finalSignatureData.length < 50) {
      return toast.error("A valid digital signature is mandatory to submit your Gas Customer Application.");
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

    if (customerType === "BUSINESS" && !businessName.trim()) {
      toast.error("Business name is required for Business customer applications.");
      return;
    }

    // Signature data payload
    const signatureData = finalSignatureData;

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
        customerType,
        hasPreviousPurchases,
        previousAccountDetails: hasPreviousPurchases ? previousAccountDetails.trim() : undefined,
        customerCode:
          hasPreviousPurchases && knowsAccountNumber && previousAccountDetails.trim()
            ? normalizeAccountNumber(previousAccountDetails)
            : undefined,
        accountNumber:
          hasPreviousPurchases && knowsAccountNumber && previousAccountDetails.trim()
            ? normalizeAccountNumber(previousAccountDetails)
            : undefined,
        isExistingCustomer: hasPreviousPurchases,
        accountLookupRequested: hasPreviousPurchases && !knowsAccountNumber,
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

      const targetDraftId = activeCustomerId || user.id;
      if (targetDraftId) {
        await clearAllDrafts(targetDraftId).catch(() => {});
      }
      setDraftStatus("idle");

      toast.success("Gas Customer Application submitted successfully! Status: Pending Approval.");
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
      autoComplete="off"
      className={cn(
        "rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-10 space-y-9 text-left shadow-sm",
        embedded ? "border-0 p-0 shadow-none" : "",
      )}
    >
      {/* Header Banner */}
      <div className="space-y-2 border-b border-slate-100 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-red-600">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span>Official Calor Gas Distributor • Customer Onboarding Application</span>
          </div>

          {/* Draft Auto-Save Status Indicator */}
          {draftStatus !== "idle" && (
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300",
                draftStatus === "saving"
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200",
              )}
              title={lastSavedTime ? `Last saved at ${lastSavedTime}` : undefined}
            >
              {draftStatus === "saving" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Draft saved</span>
                  {lastSavedTime && (
                    <span className="text-[11px] font-normal text-emerald-600/80 hidden sm:inline">
                      ({lastSavedTime})
                    </span>
                  )}
                </>
              )}
            </div>
          )}
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
              <option value="">Select...</option>
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

          <div className="sm:col-span-2 lg:col-span-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-amber-50/30 to-transparent border border-amber-200/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
                <Phone className="h-3.5 w-3.5" />
              </div>
              <div>
                <Label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Preferred Contact Method
                </Label>
                <p className="text-[10px] text-slate-500 font-medium">
                  Select your primary communication channel for order dispatches and delivery updates
                </p>
              </div>
            </div>
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
                      ? "border-amber-600 bg-amber-500 text-white shadow-xs font-black"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
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
          <div className="sm:col-span-2 lg:col-span-4 p-4 rounded-2xl bg-gradient-to-r from-sky-50/70 via-sky-50/30 to-transparent border border-sky-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-sky-200/60">
              <div className="h-6 w-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 border border-sky-200/60">
                <Truck className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Alternative Delivery &amp; Billing Arrangements
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Configure secondary delivery drop-offs or head office billing addresses
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={hasDifferentDelivery}
                onChange={(e) => setHasDifferentDelivery(e.target.checked)}
                className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>Delivery drop-off address is different from primary premises address</span>
            </label>

            {hasDifferentDelivery && (
              <div className="space-y-1 pl-6 pt-1 animate-in fade-in-50 duration-200">
                <Label className="text-xs font-bold text-slate-700">Dedicated Drop-Off Address *</Label>
                <Input
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Rear Yard / Farm Barn Access, Whitminster Lane, GL10 3RA"
                  className="rounded-xl h-11 text-xs bg-white"
                />
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={hasDifferentBilling}
                onChange={(e) => setHasDifferentBilling(e.target.checked)}
                className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500"
              />
              <span>Billing address is different from delivery address (e.g. Accounts Dept / Head Office)</span>
            </label>

            {hasDifferentBilling && (
              <div className="space-y-1 pl-6 pt-1 animate-in fade-in-50 duration-200">
                <Label className="text-xs font-bold text-slate-700">Billing Address &amp; Postcode *</Label>
                <Textarea
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Full legal billing address for invoices..."
                  className="rounded-xl text-xs bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: GAS USAGE & APPLICATION CLASSIFICATION */}
      {/* ========================================================================= */}
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
                3
              </span>
              <Flame className="h-4 w-4 text-primary" /> Customer Classification &amp; Gas Requirements
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Specify your account category, household or business requirements, and previous supply history.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold text-slate-600">
            {customerType === "HOME" ? "Home Account" : "Business Account"}
          </Badge>
        </div>

        {/* 3.A CUSTOMER TYPE SELECTION: HOME VS BUSINESS */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-rose-50/80 via-rose-50/30 to-transparent border border-rose-200/80">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200/60">
                <Users className="h-3.5 w-3.5" />
              </div>
              <div>
                <Label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Customer Account Classification <span className="text-primary">*</span>
                </Label>
                <p className="text-[10px] text-slate-500 font-medium">
                  Select your primary account category for household or business gas supply
                </p>
              </div>
            </div>
            <Badge className="bg-rose-100 text-rose-800 border border-rose-200/80 text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-flex">
              {customerType === "HOME" ? "Home Account" : "Business Account"}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCustomerType("HOME");
                setSelectedUsages(["DOMESTIC"]);
              }}
              className={cn(
                "p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer",
                customerType === "HOME"
                  ? "border-primary bg-red-50/60 ring-2 ring-primary/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <div
                className={cn(
                  "p-2.5 rounded-xl shrink-0",
                  customerType === "HOME" ? "bg-primary text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900">Home Customer</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Domestic household gas supply for central heating, cooking, portable radiant heaters, and patio BBQ.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomerType("BUSINESS");
                if (!selectedUsages.some((u) => u === "COMMERCIAL" || u === "BULK")) {
                  setSelectedUsages(["COMMERCIAL"]);
                }
              }}
              className={cn(
                "p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer",
                customerType === "BUSINESS"
                  ? "border-primary bg-red-50/60 ring-2 ring-primary/20 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <div
                className={cn(
                  "p-2.5 rounded-xl shrink-0",
                  customerType === "BUSINESS" ? "bg-primary text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900">Business Customer</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Commercial kitchens, pubs, hotels, agricultural estates, forklift truck fleets, and trade bulk vessels.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* 3.B PREVIOUS CUSTOMER CHECK */}
        <div className="space-y-3 rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-indigo-50/30 to-transparent p-4 sm:p-5">
          <div className="flex items-center gap-2.5 pb-2 border-b border-indigo-200/60">
            <div className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 border border-indigo-200/60">
              <History className="h-3.5 w-3.5" />
            </div>
            <div>
              <Label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Previous Supply History &amp; Account Lookup <span className="text-primary">*</span>
              </Label>
              <p className="text-[10px] text-slate-500 font-medium">
                Check if you already have an existing John Stayte paper depot account or purchase record
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHasPreviousPurchases(false)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                !hasPreviousPurchases
                  ? "border-primary bg-primary text-white shadow-xs"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700",
              )}
            >
              No, I am a New Customer
            </button>
            <button
              type="button"
              onClick={() => setHasPreviousPurchases(true)}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                hasPreviousPurchases
                  ? "border-primary bg-primary text-white shadow-xs"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700",
              )}
            >
              Yes, I have Purchased Previously
            </button>
          </div>

          {hasPreviousPurchases && (
            <div className="pt-3 border-t border-slate-200/70 space-y-3 animate-in fade-in-50 duration-200">
              <div>
                <Label className="text-xs font-bold text-slate-800 block mb-1.5">
                  Do you know your John Stayte account number?
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKnowsAccountNumber(true)}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                      knowsAccountNumber === true
                        ? "border-primary bg-primary text-white shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700",
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKnowsAccountNumber(false);
                      setPreviousAccountDetails("");
                    }}
                    className={cn(
                      "py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center",
                      knowsAccountNumber === false
                        ? "border-primary bg-primary text-white shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700",
                    )}
                  >
                    No
                  </button>
                </div>
              </div>

              {knowsAccountNumber === true && (
                <div className="space-y-1.5 pt-1 animate-in fade-in-50 duration-200">
                  <Label className="text-xs font-bold text-slate-800">
                    John Stayte Account Number (e.g. RTAY16, CHNO03)
                  </Label>
                  <Input
                    value={previousAccountDetails}
                    onChange={(e) =>
                      setPreviousAccountDetails(normalizeAccountNumber(e.target.value))
                    }
                    placeholder="Enter account number (e.g. RTAY16, CHNO03)"
                    className="h-10 text-xs font-mono font-bold uppercase bg-white border-slate-300 tracking-wider"
                  />
                  <p className="text-[10px] text-slate-500">
                    Found on your paper delivery ticket, invoice, or monthly statement.
                  </p>

                  {previousAccountDetails && isValidAccountNumberFormat(previousAccountDetails) && (
                    <div className="pt-1.5">
                      <CustomerAccountNumberBadge
                        accountNumber={previousAccountDetails}
                        variant="compact"
                        showCopy={false}
                      />
                    </div>
                  )}
                </div>
              )}

              {knowsAccountNumber === false && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs leading-relaxed animate-in fade-in-50">
                  <p className="font-extrabold text-[11px] uppercase tracking-wide">
                    Existing Customer Account Lookup
                  </p>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    No problem! Upon submission, our depot manager will cross-reference your name, delivery address, and historical invoice records to link your existing account number, cylinder agreements, and preferential pricing terms.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3.C GAS USAGE CATEGORIES */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-transparent border border-amber-200/80">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60">
                <Flame className="h-3.5 w-3.5" />
              </div>
              <div>
                <Label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Gas Usage Categories (Select All That Apply)
                </Label>
                <p className="text-[10px] text-slate-500 font-medium">
                  Identify your intended fuel usage for tailored pricing and cylinder allocation
                </p>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200/80 text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-flex">
              {selectedUsages.length} Active
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
          <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/80 via-blue-50/40 to-transparent p-5 space-y-4 animate-in fade-in-50 duration-200 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-2 border-b border-blue-200/70">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-black text-blue-950 uppercase tracking-wider">
                  Commercial Business &amp; Trade Information
                </p>
                <p className="text-[10px] text-blue-700 font-medium">
                  Company registration, industry sector, and trade billing contacts
                </p>
              </div>
            </div>

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
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
                4
              </span>
              <Package className="h-4 w-4 text-primary" /> Gas &amp; Cylinder Requirements
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Two-Step Selection: First select your gas requirements, then configure the relevant cylinder sizes.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DIVISION 1: GAS TYPES / PRODUCTS REQUIRED (STEP 1) */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-red-50/80 via-red-50/30 to-transparent border border-red-200/80">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-red-100 text-primary flex items-center justify-center shrink-0 border border-red-200/70">
                <Flame className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                    Gas Types / Products Required (Multi-Select)
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                      selectedGasTypes.length > 0
                        ? "bg-primary text-white border border-primary/20"
                        : "bg-white text-slate-600 border border-slate-200",
                    )}
                  >
                    {selectedGasTypes.length > 0 ? `${selectedGasTypes.length} Selected` : "Step 1"}
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Step 1: Choose the gas types or fuels required for your appliances and site.
                </p>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-full shrink-0 self-start sm:self-auto shadow-2xs">
              Click to select multiple
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {GAS_TYPES_LIST.map((g) => {
              const isChecked = selectedGasTypes.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGasType(g.id)}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-start justify-between gap-2.5 group",
                    isChecked
                      ? "border-primary/50 bg-gradient-to-br from-red-50/60 via-white to-red-50/20 ring-1 ring-primary/30 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 shadow-xs text-slate-600",
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-extrabold text-xs text-slate-900 group-hover:text-primary transition-colors">
                        {g.label}
                      </p>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100/90 text-slate-600 border border-slate-200/60">
                        {g.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">{g.detail}</p>
                  </div>
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                      isChecked
                        ? "bg-primary border-primary text-white shadow-xs"
                        : "border-slate-300 bg-white group-hover:border-slate-400",
                    )}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Callout Bar to Step 2 */}
          {selectedGasTypes.length > 0 ? (
            <div className="p-3.5 sm:p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-red-50/70 via-white to-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5 text-left">
                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>Step 2: Cylinder Size Selection</span>
                  <Badge className="bg-primary text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    {selectedCylinderSizes.length > 0
                      ? `${selectedCylinderSizes.length} Selected`
                      : "Required"}
                  </Badge>
                </p>
                <p className="text-[11px] text-slate-600 font-medium">
                  {selectedCylinderSizes.length > 0
                    ? `Cylinder sizes configured for your ${selectedGasTypes.length} gas requirement(s). Click to review or update.`
                    : `${selectedGasTypes.length} gas type(s) selected. Click to select your matching cylinder sizes.`}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setIsCylinderModalOpen(true)}
                className="w-full sm:w-auto h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Package className="h-4 w-4" />
                <span>
                  {hasConfirmedCylinderSizes && selectedCylinderSizes.length > 0
                    ? "Change Cylinder Sizes"
                    : "Select Cylinder Sizes"}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center text-xs text-slate-500 font-medium">
              Select at least one gas type above to choose cylinder size requirements.
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* DIVISION 2: CYLINDER SIZES REQUIRED (STEP 2 - SHOWN ONLY AFTER CONFIRMATION) */}
        {/* ========================================================================= */}
        {hasConfirmedCylinderSizes && selectedCylinderSizes.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 via-white to-emerald-50/20 shadow-xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-emerald-50/30 to-transparent border border-emerald-200/80">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/70">
                  <Package className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Cylinder Sizes Required (Multi-Select)
                    </span>
                    <Badge className="bg-emerald-600 text-white border border-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {selectedCylinderSizes.length} Selected
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Step 2: Configured cylinder capacities matched to your active fuel requirements
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCylinderModalOpen(true)}
                className="rounded-xl border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 text-xs font-bold h-8 px-3 flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto bg-white"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-700" />
                <span>Change Sizes</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {selectedCylinderSizes.map((id) => {
                const item = ALL_CYLINDER_SIZES.find((sz) => sz.id === id);
                return (
                  <div
                    key={id}
                    className="p-3 rounded-xl border border-primary/30 bg-white shadow-2xs flex flex-col justify-between h-20 text-left"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-black text-slate-900 leading-snug">
                        {item?.label || id}
                      </span>
                      <div className="h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium truncate">
                      {item?.desc || item?.category || ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* POPUP / MODAL: STEP 2 CYLINDER SIZE SELECTION */}
        {/* ========================================================================= */}
        <Dialog open={isCylinderModalOpen} onOpenChange={setIsCylinderModalOpen}>
          <DialogContent className="max-w-2xl w-[94vw] max-h-[88vh] p-0 gap-0 rounded-3xl bg-white border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-red-50/70 via-white to-slate-50/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-xl bg-red-100/80 text-primary flex items-center justify-center shrink-0 border border-red-200/60 mt-0.5">
                    <Package className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>Cylinder Sizes Required</span>
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold px-2 py-0.5 rounded-full"
                      >
                        {selectedCylinderSizes.length} Selected
                      </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                      Step 2: Choose one or more cylinder sizes for your selected gas requirements.
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Active Selected Gas Type Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Gas Types:
                </span>
                {selectedGasTypes.map((gid) => {
                  const gas = GAS_TYPES_LIST.find((g) => g.id === gid);
                  return (
                    <span
                      key={gid}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {gas?.label || gid}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto max-h-[50vh] space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">
                  Relevant Cylinder Capacities (
                  {getAvailableCylinderSizes(selectedGasTypes).length})
                </p>
                <span className="text-[11px] text-slate-400 font-medium">
                  Click to select multiple
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {getAvailableCylinderSizes(selectedGasTypes).map((sz) => {
                  const isChecked = selectedCylinderSizes.includes(sz.id);
                  return (
                    <button
                      key={sz.id}
                      type="button"
                      onClick={() => toggleCylinderSize(sz.id)}
                      className={cn(
                        "p-3 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-start justify-between gap-3 group",
                        isChecked
                          ? "border-primary/50 bg-red-50/50 ring-1 ring-primary/30 shadow-2xs"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs",
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900 group-hover:text-primary transition-colors">
                            {sz.label}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                            {sz.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                          {sz.desc}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                          isChecked
                            ? "bg-primary border-primary text-white shadow-2xs"
                            : "border-slate-300 bg-white group-hover:border-slate-400",
                        )}
                      >
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCylinderModalOpen(false)}
                className="rounded-xl border-slate-300 text-slate-700 hover:bg-white text-xs font-bold h-10 px-4 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </Button>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  {selectedCylinderSizes.length} size{selectedCylinderSizes.length !== 1 ? "s" : ""} selected
                </span>
                <Button
                  type="button"
                  onClick={() => {
                    if (selectedCylinderSizes.length === 0) {
                      toast.info("Please select at least one cylinder size.");
                      return;
                    }
                    setHasConfirmedCylinderSizes(true);
                    setIsCylinderModalOpen(false);
                    toast.success(
                      `${selectedCylinderSizes.length} cylinder size${selectedCylinderSizes.length > 1 ? "s" : ""} confirmed.`,
                    );
                  }}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs h-10 px-5 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* DIVISION 3: CYLINDER BANK & CONNECTION SPECIFICATIONS */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-transparent border border-amber-200/80">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/70">
                <Wrench className="h-3.5 w-3.5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                    Cylinder Bank &amp; Connection Setup
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Setup &amp; Safety
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Specify your exchange cylinder status, quantity bank setup, regulator type, and storage location.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
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

        <div className="space-y-3 pt-1">
          {/* Subheading 1: Safe Storage & Ventilation Compliance */}
          <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 via-white to-transparent p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-200/70">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider block">
                    Safe Storage &amp; Ventilation Compliance
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    UK Pressure Systems Safety Regulations 2000 &amp; Gas Safety Regulations 1998
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                UK Safety Mandate
              </Badge>
            </div>
            <label className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-emerald-200/70 cursor-pointer shadow-2xs hover:border-emerald-300 transition-colors">
              <input
                type="checkbox"
                required
                checked={storageConfirmed}
                onChange={(e) => setStorageConfirmed(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 mt-0.5 cursor-pointer"
              />
              <span className="font-bold text-slate-900 text-xs leading-snug">
                I confirm that all gas cylinders will be stored upright in well-ventilated outdoor areas, away from drains, cellar openings, heat sources, and combustible materials. *
              </span>
            </label>
          </div>

          {/* Subheading 2: Gas Supply Terms & Legal Declaration */}
          <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/60 via-white to-transparent p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 border border-purple-200/70">
                  <FileText className="h-3.5 w-3.5 text-purple-700" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider block">
                    Gas Supply Terms &amp; Legal Declaration
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Standard Conditions of Supply, cylinder ownership, and legal usage declaration
                  </p>
                </div>
              </div>
              <Badge className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                Supply Agreement
              </Badge>
            </div>
            <label className="flex items-start gap-3 p-3.5 bg-white rounded-xl border border-purple-200/70 cursor-pointer shadow-2xs hover:border-purple-300 transition-colors">
              <input
                type="checkbox"
                required
                checked={declarationAccepted}
                onChange={(e) => setDeclarationAccepted(e.target.checked)}
                className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 mt-0.5 cursor-pointer"
              />
              <span className="font-bold text-slate-900 text-xs leading-snug">
                I agree to John Stayte Services{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsTermsModalOpen(true);
                  }}
                  className="text-primary underline hover:text-red-700 font-extrabold cursor-pointer inline-flex items-center gap-0.5 transition-colors"
                >
                  Read Terms &amp; Conditions
                </button>
                . I confirm that all details provided are true and accurate. *
              </span>
            </label>
          </div>
        </div>

        {/* Terms & Conditions Modal */}
        <Dialog open={isTermsModalOpen} onOpenChange={setIsTermsModalOpen}>
          <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] p-0 gap-0 rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-red-50/70 via-white to-slate-50/50 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-100/80 text-primary flex items-center justify-center shrink-0 border border-red-200/60">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Terms &amp; Conditions of Gas Supply
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5">
                    Gas supply rules, cylinder refill &amp; exchange policies, and safety compliance.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7 overflow-y-auto max-h-[62vh]">
              <ConditionsOfUseContent />
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <p className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Please review all terms before ticking the agreement checkbox.
              </p>
              <Button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-full sm:w-auto ml-auto rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 px-6 shadow-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-transparent border border-blue-200/80">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-black shadow-2xs">
                  A
                </span>
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider block">
                    Step A: Application Email Authentication
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Request a 6-digit security verification code to authenticate your contact email.
                  </p>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 self-start sm:self-auto">
                Step 1 of 2
              </Badge>
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
          <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border-2 border-amber-300/80 shadow-sm animate-in fade-in-50 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-transparent border border-amber-200/80">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-600 text-white text-[11px] font-black shadow-2xs">
                  B
                </span>
                <KeyRound className="h-4 w-4 text-amber-700" />
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider block">
                    Step B: 6-Digit Security Code Verification
                  </span>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                    Enter the code sent to your email to complete verification.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Step 2 of 2
                </Badge>
                <button
                  type="button"
                  onClick={handleChangeEmailClick}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Change Email
                </button>
              </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-transparent border border-emerald-300 animate-in fade-in-50 duration-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wider">
                    Email Identity Authenticated
                  </p>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.2 rounded-full">
                    Verified
                  </Badge>
                </div>
                <p className="text-xs text-emerald-800">
                  Application authenticated for: <span className="font-mono font-bold text-emerald-950">{verifiedEmail}</span>
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleChangeEmailClick}
              className="text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 border-emerald-300 h-9 px-4 rounded-xl font-bold self-start sm:self-auto cursor-pointer bg-white"
            >
              Change Email
            </Button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 7: CUSTOMER DIGITAL SIGNATURE (DRAW OR UPLOAD) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-100 text-primary text-xs font-black">
              7
            </span>
            <PenTool className="h-4 w-4 text-primary" /> Customer Digital Signature *
          </h3>
          {(signatureMode === "draw" ? hasSigned : Boolean(uploadedSignatureData)) && (
            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              ✓ Signature Captured
            </Badge>
          )}
        </div>

        {/* DIVISION: SIGNATURE CAPTURE METHOD */}
        <div className="rounded-2xl border border-red-200/80 bg-gradient-to-r from-red-50/70 via-red-50/20 to-transparent p-3 sm:p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-6 w-6 rounded-lg bg-red-100 text-primary flex items-center justify-center shrink-0 border border-red-200/70">
                <PenTool className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                    Signature Input Method
                  </span>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {signatureMode === "draw" ? "Touch / Mouse Canvas" : "Image File Upload"}
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                  Select your preferred input method and sign below to legally execute your application.
                </p>
              </div>
            </div>

            {/* Segmented Mode Selector: Draw vs Upload */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs w-fit shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSignatureMode("draw")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  signatureMode === "draw"
                    ? "bg-primary text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Draw Signature</span>
                {hasSigned && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Drawn signature saved" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode("upload")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  signatureMode === "upload"
                    ? "bg-primary text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Signature</span>
                {uploadedSignatureData && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Uploaded signature saved" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-red-100/80 gap-1.5">
            <p className="text-[11px]">
              {signatureMode === "draw"
                ? "Sign inside the box using your finger, stylus, mouse, or trackpad."
                : "Upload an image of your physical signature (PNG, JPG, or JPEG up to 2 MB)."}
            </p>
            <p className="text-[11px] text-slate-500 font-medium shrink-0">
              Signatory: <span className="font-bold text-slate-800">{fullName || "Applicant"}</span> • Date: <span className="font-mono text-slate-800">{new Date().toLocaleDateString("en-GB")}</span>
            </p>
          </div>
        </div>

        {/* Hidden File Input for Signature Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* OPTION 1: DRAW SIGNATURE CANVAS (Kept mounted in DOM to preserve drawing across tab switches) */}
        <div className={cn("space-y-2", signatureMode === "draw" ? "block" : "hidden")}>
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

        {/* OPTION 2: UPLOAD SIGNATURE (Kept mounted in DOM to preserve upload across tab switches) */}
        <div className={cn("space-y-2", signatureMode === "upload" ? "block" : "hidden")}>
          {!uploadedSignatureData ? (
            /* Upload Drop Area */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative rounded-2xl border-2 border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[160px] sm:min-h-[192px]",
                isDragging
                  ? "border-primary bg-red-50/30 scale-[1.005]"
                  : "border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400 shadow-2xs"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-primary mb-3">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                Click to browse or drag & drop signature image
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-1">
                Supported formats: <strong className="text-slate-700">PNG, JPG, or JPEG</strong> (max 2 MB)
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 rounded-full text-xs font-bold h-8 px-4 border-slate-300 hover:bg-white pointer-events-none"
              >
                Choose Image File
              </Button>
            </div>
          ) : (
            /* Upload Preview Box */
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-2xs space-y-3">
              <div className="relative rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 min-h-[130px] flex items-center justify-center overflow-hidden">
                <img
                  src={uploadedSignatureData}
                  alt="Uploaded Signature Preview"
                  className="max-h-32 sm:max-h-36 max-w-full object-contain mx-auto drop-shadow-2xs"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-slate-800 truncate max-w-[220px] sm:max-w-xs">
                    {uploadedFileName || "Uploaded Signature"}
                  </span>
                  {uploadedFileSize && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({formatFileSize(uploadedFileSize)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full h-8 px-3 text-xs font-bold gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Replace Image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveUploadedSignature}
                    className="rounded-full h-8 px-3 text-xs font-bold gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error Banner */}
          {uploadError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <p className="font-semibold leading-relaxed">{uploadError}</p>
            </div>
          )}
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
