import { useState, useEffect } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import {
  Home,
  Building2,
  Factory,
  Check,
  ChevronRight,
  Flame,
  RotateCcw,
  PackagePlus,
  Truck,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  Banknote,
  Loader2,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Lock,
  Plus,
  FileSignature,
  Star,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
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
} from "@/components/ui/dialog";
import { gbp, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  UsageType,
  OrderType,
  ReturnMethod,
  GasProductRecord,
  getGasProductsByUsage,
  getAvailableSlots,
  createGasOrder,
  validateAndCalculateOrderTotal,
  SlotConfig,
} from "@/lib/cylinder-service";
import {
  getCustomerGasApplication,
  GasCustomerApplication,
} from "@/lib/application-service";
import { GasCustomerApplicationForm } from "@/components/customer/GasCustomerApplicationForm";

export const Route = createFileRoute("/order-gas")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Order Gas Online | Domestic, Commercial & Bulk LPG | John Stayte Services" },
      {
        name: "description",
        content:
          "Order domestic, commercial or bulk LPG gas cylinders online with next-day forecourt delivery across Gloucestershire.",
      },
      { property: "og:title", content: "Order Gas Online | John Stayte Services" },
      {
        property: "og:description",
        content:
          "Official Calor Gas distributor in Gloucestershire. Order new cylinders or book refill exchanges with fast delivery.",
      },
    ],
  }),
  component: OrderGasPage,
});

export function OrderGasPage() {
  const { user, login, register } = useStore();
  const navigate = useNavigate();

  // Gas Customer Application State (Backend source of truth)
  const [customerApp, setCustomerApp] = useState<GasCustomerApplication | null>(null);
  const [checkingApp, setCheckingApp] = useState<boolean>(true);
  const [showApplicationModal, setShowApplicationModal] = useState<boolean>(false);

  // Wizard Step State (0 to 5, where 5 is Confirmation)
  // Step 0: Choose Usage
  // Step 1: Choose Gas / Cylinder
  // Step 2: New vs Refill
  // Step 3: Delivery & Scheduling
  // Step 4: Summary & Payment
  // Step 5: Confirmation
  const [step, setStep] = useState<number>(0);

  // Step 0: Usage Type
  const [usageType, setUsageType] = useState<UsageType | null>(null);

  // Step 1: Product & Quantity
  const [products, setProducts] = useState<GasProductRecord[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productFetchError, setProductFetchError] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [detailProduct, setDetailProduct] = useState<GasProductRecord | null>(null);
  const [detailActiveImg, setDetailActiveImg] = useState<string>("");

  // Step 2: Order Type & Empty Return
  const [orderType, setOrderType] = useState<OrderType>("NEW_CYLINDER");
  const [confirmedHasEmpty, setConfirmedHasEmpty] = useState<boolean>(false);
  const [returnMethod, setReturnMethod] = useState<ReturnMethod>("RETURN_ON_DELIVERY");
  const [cylinderTag, setCylinderTag] = useState<string>("");

  // Step 3: Delivery / Pickup Details & Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("custom");
  const [customerName, setCustomerName] = useState<string>(user?.name || "");
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || "");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState<string>("");
  const [availableDeliverySlots, setAvailableDeliverySlots] = useState<any[]>([]);

  // Refill Pickup Scheduling (when returnMethod === "SCHEDULED_PICKUP")
  const [pickupAddress, setPickupAddress] = useState<string>("");
  const [pickupDate, setPickupDate] = useState<string>("");
  const [selectedPickupSlot, setSelectedPickupSlot] = useState<string>("");
  const [availablePickupSlots, setAvailablePickupSlots] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>("");

  // Step 4 & 5: Summary & Payment
  const [paymentMethod, setPaymentMethod] = useState<string>("Credit / Debit Card (Online)");
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Inline Auth Modal for unauthenticated guests
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Check Gas Customer Application Status for authenticated user
  useEffect(() => {
    async function checkApp() {
      if (!user?.id) {
        setCustomerApp(null);
        setCheckingApp(false);
        return;
      }
      setCheckingApp(true);
      try {
        const app = await getCustomerGasApplication(user.id);
        setCustomerApp(app);
      } catch (err) {
        console.warn("Error checking gas application status:", err);
      } finally {
        setCheckingApp(false);
      }
    }
    checkApp();
  }, [user]);

  // Load saved customer addresses from database when user is logged in
  useEffect(() => {
    async function loadCustomerAddresses() {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false });

        if (data && data.length > 0) {
          setSavedAddresses(data);
          const defaultAddr = data.find((a) => a.is_default) || data[0];
          setSelectedAddressId(defaultAddr.id);
          setDeliveryAddress(`${defaultAddr.street}, ${defaultAddr.city} ${defaultAddr.postcode}`);
          if (defaultAddr.name && !customerName) setCustomerName(defaultAddr.name);
        }
      } catch (e) {
        console.warn("Addresses fetch notice:", e);
      }
    }
    loadCustomerAddresses();
  }, [user]);

  // Sync user profile info
  useEffect(() => {
    if (user) {
      if (user.name && !customerName) setCustomerName(user.name);
      if (user.email && !customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  // Load products helper with retry and error handling
  const fetchProductsForUsage = async (type: UsageType) => {
    setLoadingProducts(true);
    setProductFetchError(false);
    try {
      const loaded = await getGasProductsByUsage(type);
      setProducts(loaded);
      if (loaded.length > 0) {
        setSelectedProductId(loaded[0].id);
      }
    } catch (err: any) {
      setProductFetchError(true);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load products when usageType changes (from REAL backend database)
  useEffect(() => {
    if (!usageType) return;
    fetchProductsForUsage(usageType);
  }, [usageType]);

  // Load available slots from backend
  useEffect(() => {
    async function loadSlots() {
      const today = new Date().toISOString().split("T")[0];
      const delSlots = await getAvailableSlots({ type: "delivery", date: deliveryDate || today });
      setAvailableDeliverySlots(delSlots);
      if (delSlots.length > 0 && !selectedDeliverySlot) {
        setSelectedDeliverySlot(delSlots[0].slot.slot_name);
      }

      if (returnMethod === "SCHEDULED_PICKUP") {
        const pSlots = await getAvailableSlots({ type: "pickup", date: pickupDate || today });
        setAvailablePickupSlots(pSlots);
        if (pSlots.length > 0 && !selectedPickupSlot) {
          setSelectedPickupSlot(pSlots[0].slot.slot_name);
        }
      }
    }
    loadSlots();
  }, [deliveryDate, pickupDate, returnMethod]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Pricing calculation
  const isNew = orderType === "NEW_CYLINDER";
  const gasPriceUnit = selectedProduct ? (isNew ? selectedProduct.price : selectedProduct.refill_price) : 0;
  const depositUnit = isNew && selectedProduct ? selectedProduct.deposit_price : 0;
  const gasTotal = gasPriceUnit * quantity;
  const depositTotal = depositUnit * quantity;
  const deliveryFee = selectedProduct?.delivery_charge || 0;
  const totalAmount = gasTotal + depositTotal + deliveryFee;

  // Step 0: Usage selection handler
  const handleSelectUsage = (type: UsageType) => {
    setUsageType(type);
    setStep(1); // Proceed to choose product
  };

  // Step 1: Product selection handler
  const handleNextFromProduct = () => {
    if (!selectedProduct) return toast.error("Please choose a gas cylinder.");
    setStep(2); // Proceed to New vs Refill
  };

  // Step 2: Order type handler
  const handleNextFromOrderType = async () => {
    if (orderType === "REFILL_EXCHANGE" && !confirmedHasEmpty) {
      return toast.error("Please confirm that you have an eligible empty cylinder to return.");
    }

    // Check application status if user is logged in
    if (user?.id) {
      try {
        const app = await getCustomerGasApplication(user.id);
        setCustomerApp(app);
        if (!app || (app.status !== "SUBMITTED" && app.status !== "APPROVED")) {
          setShowApplicationModal(true);
          return;
        }
      } catch (err) {
        console.warn("App verification check:", err);
      }
    }

    setStep(3); // Proceed to Delivery/Schedule
  };

  // Step 3: Schedule validation handler
  const handleNextFromSchedule = () => {
    if (!customerName.trim()) return toast.error("Please enter your full name.");
    if (!customerPhone.trim() || customerPhone.trim().length < 7) {
      return toast.error("Please enter a valid contact phone number.");
    }
    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 6) {
      return toast.error("Please provide a valid delivery address with postcode.");
    }
    if (!deliveryDate) {
      return toast.error("Please choose your preferred delivery date.");
    }
    if (orderType === "REFILL_EXCHANGE" && returnMethod === "SCHEDULED_PICKUP" && !pickupDate) {
      return toast.error("Please choose your preferred empty cylinder pickup date.");
    }
    setStep(4); // Proceed to Order Summary & Payment
  };

  // Inline auth handler
  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return toast.error("Email and password are required.");
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        const res = await login(authEmail, authPassword);
        if (!res.ok) throw new Error(res.error || "Invalid credentials.");
        toast.success("Signed in successfully!");
        setAuthModalOpen(false);

        // Check application status for logged-in user
        if (res.user?.id) {
          const app = await getCustomerGasApplication(res.user.id);
          setCustomerApp(app);
          if (!app || (app.status !== "SUBMITTED" && app.status !== "APPROVED")) {
            setShowApplicationModal(true);
          }
        }
      } else {
        if (!authName) return toast.error("Name is required for registration.");
        const res = await register(authName, authEmail, authPassword, "customer");
        if (!res.ok) throw new Error(res.error || "Registration failed.");
        toast.success("Account created successfully!");
        setAuthModalOpen(false);

        // New customer must complete application
        setShowApplicationModal(true);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Final Order Placement with Mandatory Application Enforcement
  const handlePlaceOrder = async () => {
    if (!user?.id) {
      setAuthModalOpen(true);
      return;
    }

    // Backend verification of Gas Customer Application
    try {
      const app = await getCustomerGasApplication(user.id);
      setCustomerApp(app);
      if (!app || (app.status !== "SUBMITTED" && app.status !== "APPROVED")) {
        setShowApplicationModal(true);
        return;
      }
    } catch (err) {
      console.warn("Error verifying customer application:", err);
    }

    if (!selectedProduct || !usageType) return;
    setSubmittingOrder(true);
    try {
      const res = await createGasOrder({
        userId: user.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || user.email,
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        usageType,
        orderType,
        productId: selectedProduct.id,
        quantity,
        deliveryDate,
        deliveryTimeSlot: selectedDeliverySlot,
        returnMethod: orderType === "REFILL_EXCHANGE" ? returnMethod : undefined,
        pickupAddress: returnMethod === "SCHEDULED_PICKUP" ? (pickupAddress.trim() || deliveryAddress.trim()) : undefined,
        pickupDate: returnMethod === "SCHEDULED_PICKUP" ? pickupDate : undefined,
        pickupTimeSlot: returnMethod === "SCHEDULED_PICKUP" ? selectedPickupSlot : undefined,
        cylinderTag: cylinderTag.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentMethod,
      });

      setCompletedOrder({
        orderId: res.orderId,
        orderNumber: res.orderNumber,
        product: selectedProduct,
        quantity,
        orderType,
        usageType,
        total: res.calculated.total,
        deliveryDate,
        deliveryTimeSlot: selectedDeliverySlot,
        paymentStatus: "Paid",
      });

      setStep(5); // Step 5: Confirmation
      toast.success(`Order #${res.orderNumber} placed successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <SiteLayout>
      <div className="bg-[#fcfdfe] min-h-[85vh] py-8 sm:py-10 lg:py-14 border-b border-slate-200/60">
        <div className="container-page max-w-[88rem] px-2 sm:px-3.5 lg:px-4 space-y-8">
          
          {/* Page Header */}
          <div className="space-y-3 text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200/90 bg-red-50/80 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 shadow-2xs backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>OFFICIAL CALOR GAS DISTRIBUTOR</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-[1.08] font-display">
              Order Gas Cylinders & Refills
            </h1>
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
              Order domestic heating, commercial appliances, and bulk forecourt LPG supplies across Gloucestershire.
            </p>
          </div>

          {/* Stepper Indicator */}
          {step < 5 && (
            <nav aria-label="Progress" className="w-full">
              <ol className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { title: "1. Usage Type", desc: usageType ? usageType : "Select Usage" },
                  { title: "2. Gas & Cylinder", desc: selectedProduct ? selectedProduct.name.slice(0, 18) + "..." : "Pick Size" },
                  { title: "3. New / Refill", desc: orderType === "NEW_CYLINDER" ? "New Purchase" : "Refill Exchange" },
                  { title: "4. Schedule & Address", desc: "Delivery Slot" },
                  { title: "5. Review & Pay", desc: "Order Total" },
                ].map((s, idx) => {
                  const isActive = step === idx;
                  const isComplete = step > idx;
                  return (
                    <li key={s.title} className="w-full">
                      <button
                        type="button"
                        onClick={() => {
                          if (idx < step) setStep(idx);
                        }}
                        disabled={idx > step}
                        className={cn(
                          "w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-xs font-extrabold transition-all text-left",
                          isActive
                            ? "border-primary bg-primary text-white shadow-md"
                            : isComplete
                            ? "border-slate-300 bg-white text-slate-900 hover:border-slate-400 shadow-2xs cursor-pointer"
                            : "border-slate-200/80 bg-slate-50 text-slate-400 cursor-not-allowed"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                            isActive
                              ? "bg-white/20 text-white"
                              : isComplete
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              : "bg-slate-200/70 text-slate-500"
                          )}
                        >
                          {isComplete ? <Check className="h-3 w-3 stroke-[3]" /> : <span>{idx + 1}</span>}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate leading-tight font-extrabold">{s.title}</p>
                          <p className={cn("text-[10px] font-normal truncate", isActive ? "text-white/80" : "text-slate-500")}>
                            {s.desc}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {/* ========================================================================= */}
          {/* STEP 0: CHOOSE USAGE (LANDING PAGE - FIRST VIEW) */}
          {/* ========================================================================= */}
          {step === 0 && (
            <div className="space-y-8 text-left">
              <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  What are you ordering gas for?
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Select your primary application below to view verified Calor products and fast delivery slots.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                {[
                  {
                    type: "DOMESTIC" as const,
                    title: "Domestic LPG",
                    badgeText: "RESIDENTIAL & HOME",
                    description:
                      "Propane, butane, patio gas, and domestic heating cylinders delivered directly to your home, BBQ, pub, or caravan.",
                    image: "/domestic_kitchen_cylinder.jpg",
                    icon: Flame,
                    btnLabel: "Explore category",
                  },
                  {
                    type: "COMMERCIAL" as const,
                    title: "Commercial LPG",
                    badgeText: "HOSPITALITY & TRADE",
                    description:
                      "High-capacity 47kg & 19kg propane bottles, FLT forklift gas, and cellar dispense gas for hotels, restaurants, pubs, and kitchens.",
                    image: "/commercial_kitchen_cylinders.jpg",
                    icon: Building2,
                    btnLabel: "Explore category",
                  },
                  {
                    type: "BULK" as const,
                    title: "Bulk LPG & Tanks",
                    badgeText: "INDUSTRIAL & BULK",
                    description:
                      "Large-scale metered bulk road tanker deliveries and static vessel tank refills for farms, industrial heating, and commercial estates.",
                    image: "/service_bulk_supply.jpg",
                    icon: Factory,
                    btnLabel: "Explore category",
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.type}
                      onClick={() => handleSelectUsage(card.type)}
                      className="group rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer text-left"
                    >
                      <div>
                        {/* Clean Straight-Edged Rectangular Image Frame (No rounded corners) */}
                        <div className="relative w-full aspect-[16/10] overflow-hidden bg-slate-100 rounded-none border border-slate-100">
                          <img
                            src={card.image}
                            alt={card.title}
                            className="h-full w-full object-cover rounded-none group-hover:scale-102 transition-transform duration-500"
                          />
                        </div>

                        {/* Category Label */}
                        <div className="flex items-center gap-1.5 pt-4">
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 font-sans">
                            {card.badgeText}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-primary transition-colors font-display tracking-tight mt-2">
                          {card.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mt-1.5">
                          {card.description}
                        </p>
                      </div>

                      {/* Red Explore Category Button */}
                      <div className="pt-5">
                        <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-[#c8102e] hover:bg-[#a50d24] text-white font-extrabold text-xs shadow-xs transition-all group-hover:shadow-md">
                          <span>{card.btnLabel}</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: CHOOSE GAS / CYLINDER (Strictly Backend Filtered by Usage) */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-900 text-white font-extrabold text-[10px] uppercase">
                      {usageType === "DOMESTIC"
                        ? "Domestic LPG"
                        : usageType === "COMMERCIAL"
                        ? "Commercial LPG"
                        : "Bulk LPG & Tanks"}
                    </Badge>
                    {products.length > 0 && (
                      <span className="text-xs text-slate-400 font-bold">
                        ({products.length} {products.length === 1 ? "Product" : "Products"} Available)
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display mt-1">
                    Select Your Gas Cylinder / Supply
                  </h2>
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-1.5 self-start">
                  <span className="text-xs font-extrabold text-slate-600 pl-3">Quantity:</span>
                  <div className="flex items-center gap-1 bg-white rounded-xl shadow-2xs border border-slate-200/90 p-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-slate-700 font-bold"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center font-black text-sm text-slate-900">{quantity}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-slate-700 font-bold"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>

              {loadingProducts ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Loading products...</p>
                </div>
              ) : productFetchError ? (
                <div className="py-16 text-center space-y-4">
                  <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-800">We couldn’t load the available gas products.</p>
                    <p className="text-xs text-slate-500">Please check your connection and try again.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => usageType && fetchProductsForUsage(usageType)}
                    className="rounded-full px-6 py-2 bg-[#c8102e] hover:bg-[#a50d24] text-white font-bold text-xs shadow-xs"
                  >
                    Try Again
                  </Button>
                </div>
              ) : products.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
                  <p className="text-base font-bold text-slate-800">No products are currently available</p>
                  <p className="text-xs text-slate-500">Please try another gas type or contact us for assistance.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {products.map((p) => {
                    const isSelected = selectedProductId === p.id;
                    const productImage = p.image_url || p.images?.[0] || "/calor-cylinders-studio.jpg";
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setDetailProduct(p);
                          setDetailActiveImg(productImage);
                        }}
                        className={cn(
                          "rounded-3xl border bg-white overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left relative group cursor-pointer",
                          isSelected ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-slate-200/80"
                        )}
                      >
                        {/* Top Image Section with OFFER & Heart */}
                        <div className="relative bg-[#f8f9fa] h-56 sm:h-64 flex items-center justify-center p-6 rounded-t-3xl overflow-hidden">
                          {/* Offer Badge */}
                          <span className="absolute top-4 left-4 z-10 bg-[#c8102e] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                            OFFER
                          </span>

                          {/* Wishlist Heart Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.success(`Saved ${p.name} to wishlist!`);
                            }}
                            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-200 shadow-xs cursor-pointer transition-colors"
                          >
                            <Heart className="h-4 w-4" />
                          </button>

                          {/* Product Image */}
                          <img
                            src={productImage}
                            alt={p.name}
                            className="h-40 sm:h-44 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Content Body */}
                        <div className="p-5 sm:p-6 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 font-sans block">
                              {p.brand || "CALOR"}
                            </span>

                            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug line-clamp-2">
                              {p.name}
                            </h3>

                            {/* Cylinder Size / Subcategory */}
                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                              <span className="font-bold text-slate-700">{p.cylinder_size || p.gas_type}</span>
                              {p.subcategory && <span>• {p.subcategory}</span>}
                            </div>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            {/* Price */}
                            <div className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                              {gbp(p.price)}
                            </div>

                            {/* Stock Indicator */}
                            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>In Stock</span>
                            </div>

                            {/* Red Action Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailProduct(p);
                                setDetailActiveImg(productImage);
                              }}
                              className="w-full rounded-full py-3 text-white font-extrabold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-3 bg-[#c8102e] hover:bg-[#a50d24] active:scale-[0.98]"
                            >
                              <span>View details & select</span>
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(0)}
                  className="rounded-full px-6 py-2.5 h-11 font-bold text-slate-700"
                >
                  Change Usage Type
                </Button>

                <Button
                  type="button"
                  onClick={handleNextFromProduct}
                  className="rounded-full px-8 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer h-12"
                >
                  <span>Continue to Order Type</span>
                  <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: NEW CYLINDER VS REFILL / EXCHANGE */}
          {/* ========================================================================= */}
          {step === 2 && selectedProduct && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 max-w-4xl mx-auto">
              <div className="text-left space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  How would you like to order?
                </h2>
                <p className="text-sm text-slate-500">
                  Select whether you need a brand-new bottle or are exchanging an empty Calor cylinder.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Option 1: New Cylinder */}
                <button
                  type="button"
                  onClick={() => setOrderType("NEW_CYLINDER")}
                  className={cn(
                    "p-6 rounded-3xl border text-left transition-all cursor-pointer space-y-4",
                    orderType === "NEW_CYLINDER"
                      ? "border-primary ring-2 ring-primary/20 bg-red-50/20 shadow-md"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <PackagePlus className="h-6 w-6" />
                    </div>
                    <Badge className="bg-blue-600 text-white font-extrabold text-[10px]">NEW PURCHASE</Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900">Option 1: New Cylinder</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Select this if you do not have an empty Calor bottle to return. A refundable cylinder security deposit of{" "}
                      <strong className="text-slate-900 font-bold">{gbp(selectedProduct.deposit_price)}</strong> will be added.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gas Content:</span>
                      <span className="font-bold">{gbp(selectedProduct.price)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-bold">
                      <span>Security Deposit:</span>
                      <span>+{gbp(selectedProduct.deposit_price)}</span>
                    </div>
                  </div>
                </button>

                {/* Option 2: Refill / Exchange */}
                <button
                  type="button"
                  onClick={() => setOrderType("REFILL_EXCHANGE")}
                  className={cn(
                    "p-6 rounded-3xl border text-left transition-all cursor-pointer space-y-4",
                    orderType === "REFILL_EXCHANGE"
                      ? "border-primary ring-2 ring-primary/20 bg-red-50/20 shadow-md"
                      : "border-slate-200/90 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <RotateCcw className="h-6 w-6" />
                    </div>
                    <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">REFILL EXCHANGE</Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900">Option 2: Refill / Exchange</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Return your empty cylinder when receiving your refill. Zero cylinder deposit charge applies.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gas Content:</span>
                      <span className="font-bold">{gbp(selectedProduct.refill_price)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Deposit Fee:</span>
                      <span>£0.00 (Exchanged)</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Refill Exchange Specific Policy & Return Method Choice */}
              {orderType === "REFILL_EXCHANGE" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-amber-900">
                      <p className="font-extrabold text-sm">Empty Cylinder Return Requirement:</p>
                      <p className="leading-relaxed">
                        Return your empty cylinder when receiving your refill. An empty bottle of equivalent group/size must be available for collection before your refilled bottle is completed.
                      </p>
                    </div>
                  </div>

                  {/* Checkbox confirmation */}
                  <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedHasEmpty}
                      onChange={(e) => setConfirmedHasEmpty(e.target.checked)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-bold text-slate-900">
                      I confirm I have an eligible empty cylinder ready for collection/exchange. *
                    </span>
                  </label>

                  {/* Return Method Selection */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                      How would you like to return your empty cylinder?
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setReturnMethod("RETURN_ON_DELIVERY")}
                        className={cn(
                          "p-3 rounded-xl border text-xs font-extrabold text-left transition-all cursor-pointer",
                          returnMethod === "RETURN_ON_DELIVERY"
                            ? "border-primary bg-white text-primary ring-1 ring-primary"
                            : "border-slate-200 bg-white/70 text-slate-700"
                        )}
                      >
                        🚚 A. Return during delivery drop-off
                      </button>

                      <button
                        type="button"
                        onClick={() => setReturnMethod("SCHEDULED_PICKUP")}
                        className={cn(
                          "p-3 rounded-xl border text-xs font-extrabold text-left transition-all cursor-pointer",
                          returnMethod === "SCHEDULED_PICKUP"
                            ? "border-primary bg-white text-primary ring-1 ring-primary"
                            : "border-slate-200 bg-white/70 text-slate-700"
                        )}
                      >
                        📅 B. Schedule a separate pickup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-full px-6 py-2.5 h-11 font-bold text-slate-700"
                >
                  Back to Products
                </Button>

                <Button
                  type="button"
                  onClick={handleNextFromOrderType}
                  className="rounded-full px-8 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer h-12"
                >
                  <span>Continue to Scheduling</span>
                  <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: DELIVERY & PICKUP DETAILS (With Saved Address & Backend Slots) */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8">
              <div className="text-left space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  Delivery & Pickup Details
                </h2>
                <p className="text-sm text-slate-500">
                  Select your Gloucestershire delivery address and preferred delivery time window.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left">
                {/* Left: Contact & Address Selection */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> Delivery Destination
                  </h3>

                  {/* Saved addresses from Customer Account */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700">Choose from Saved Addresses:</Label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedAddressId(val);
                          if (val !== "custom") {
                            const found = savedAddresses.find((a) => a.id === val);
                            if (found) {
                              setDeliveryAddress(`${found.street}, ${found.city} ${found.postcode}`);
                              if (found.name) setCustomerName(found.name);
                            }
                          }
                        }}
                        className="w-full h-11 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold focus:ring-2 focus:ring-primary/20"
                      >
                        {savedAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.label || addr.street} ({addr.city}, {addr.postcode})
                          </option>
                        ))}
                        <option value="custom">+ Enter a different delivery address</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Recipient Full Name *</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. David Clarke"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Contact Telephone Number *</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 01452 741234 or 07700 900123"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Delivery Street Address & Postcode *</Label>
                    <Textarea
                      rows={3}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Full street address, town, and Gloucestershire postcode..."
                      className="rounded-xl p-3 text-xs"
                    />
                  </div>
                </div>

                {/* Right: Scheduling with Backend Slot Capacity */}
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" /> Delivery Window & Notes
                  </h3>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Preferred Delivery Date *</Label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Available Delivery Time Slot *</Label>
                    <div className="space-y-2">
                      {availableDeliverySlots.map(({ slot, available, remainingCapacity }) => (
                        <label
                          key={slot.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all",
                            !available
                              ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                              : selectedDeliverySlot === slot.slot_name
                              ? "border-primary bg-red-50/40 text-slate-900 ring-1 ring-primary"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="radio"
                              name="deliverySlot"
                              disabled={!available}
                              checked={selectedDeliverySlot === slot.slot_name}
                              onChange={() => setSelectedDeliverySlot(slot.slot_name)}
                              className="text-primary"
                            />
                            <span>{slot.slot_name}</span>
                          </div>
                          <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full", available ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                            {available ? `${remainingCapacity} slots open` : "Fully Booked"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Refill Pickup Schedule (if separate pickup requested) */}
                  {orderType === "REFILL_EXCHANGE" && returnMethod === "SCHEDULED_PICKUP" && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3 pt-3">
                      <p className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-amber-600" /> Empty Cylinder Pickup Schedule:
                      </p>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700">Pickup Date *</Label>
                        <Input
                          type="date"
                          value={pickupDate}
                          onChange={(e) => setPickupDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="rounded-xl h-10 text-xs bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-bold text-slate-700">Pickup Time Window</Label>
                        <select
                          value={selectedPickupSlot}
                          onChange={(e) => setSelectedPickupSlot(e.target.value)}
                          className="w-full h-10 rounded-xl border border-slate-200 px-3 bg-white text-xs font-bold"
                        >
                          {availablePickupSlots.map(({ slot }) => (
                            <option key={slot.id} value={slot.slot_name}>
                              {slot.slot_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Driver Delivery Instructions (Optional)</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Leave in gas cage / Ring side bell"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="rounded-full px-6 py-2.5 h-11 font-bold text-slate-700"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleNextFromSchedule}
                  className="rounded-full px-8 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer h-12"
                >
                  <span>Review Order Summary</span>
                  <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: ORDER SUMMARY & PAYMENT */}
          {/* ========================================================================= */}
          {step === 4 && selectedProduct && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 max-w-3xl mx-auto">
              <div className="text-left space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  Order Summary & Payment
                </h2>
                <p className="text-sm text-slate-500">
                  Review the itemized breakdown before submitting your order.
                </p>
              </div>

              {/* Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Application</span>
                    <p className="text-base font-black text-slate-900">{usageType} LPG Order</p>
                  </div>
                  <Badge className={cn("text-xs font-extrabold px-3 py-1", isNew ? "bg-blue-600 text-white" : "bg-emerald-600 text-white")}>
                    {isNew ? "NEW CYLINDER" : "REFILL EXCHANGE"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500 font-medium">Selected Gas Product:</span>
                    <p className="font-extrabold text-slate-900">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Quantity:</span>
                    <p className="font-extrabold text-slate-900">{quantity} Cylinder(s)</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Recipient:</span>
                    <p className="font-extrabold text-slate-900">{customerName} ({customerPhone})</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Delivery Destination:</span>
                    <p className="font-extrabold text-slate-900 truncate">{deliveryAddress}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-medium">Delivery Slot:</span>
                    <p className="font-extrabold text-slate-900">{deliveryDate} ({selectedDeliverySlot})</p>
                  </div>
                </div>

                {/* Price Itemization */}
                <div className="border-t border-slate-200 pt-4 space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Gas Refill Charge ({quantity}x {gbp(gasPriceUnit)}):</span>
                    <span className="font-extrabold text-slate-900">{gbp(gasTotal)}</span>
                  </div>

                  {isNew ? (
                    <div className="flex items-center justify-between text-blue-700 font-semibold bg-blue-50/80 p-2 rounded-xl border border-blue-100">
                      <span>Cylinder Security Deposit ({quantity}x {gbp(depositUnit)}):</span>
                      <span className="font-black">{gbp(depositTotal)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-emerald-700 font-medium bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                      <span>Cylinder Deposit (Exchange Policy):</span>
                      <span className="font-extrabold">£0.00 (Exchanged Empty)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Gloucestershire Forecourt Delivery:</span>
                    <span className="font-bold text-emerald-600">{deliveryFee === 0 ? "FREE" : gbp(deliveryFee)}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base sm:text-lg font-black">
                    <span className="text-slate-900">Total Payable Amount:</span>
                    <span className="text-2xl text-primary">{gbp(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 text-left">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Payment Option</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "Credit / Debit Card (Online)", label: "Credit / Debit Card", icon: CreditCard },
                    { id: "Pay On Delivery / Collection", label: "Pay On Delivery / Collection", icon: Banknote },
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                        paymentMethod === method.id
                          ? "border-primary bg-red-50/30 text-slate-900 ring-2 ring-primary/20"
                          : "border-slate-200 bg-white hover:border-slate-300 text-slate-600"
                      )}
                    >
                      <method.icon className={cn("h-4 w-4", paymentMethod === method.id ? "text-primary" : "text-slate-400")} />
                      <span>{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Account Notice if Unauthenticated */}
              {!user && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-left flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-blue-900">
                    <p className="font-extrabold">Customer Account Sign-In Required</p>
                    <p className="text-blue-700">
                      To ensure real-time tracking, warranty protection, and invoice persistence, please sign in or register to complete this order.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingOrder}
                  onClick={() => setStep(3)}
                  className="rounded-full px-6 py-2.5 h-11 font-bold text-slate-700"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  disabled={submittingOrder}
                  onClick={handlePlaceOrder}
                  className="rounded-full px-8 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer h-12"
                >
                  {submittingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Confirming your order...</span>
                    </>
                  ) : !user ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Sign In & Place Order</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Place Order</span>
                      <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: ORDER CONFIRMATION */}
          {/* ========================================================================= */}
          {step === 5 && completedOrder && (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6">
              <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm border border-emerald-100">
                <Check className="h-8 w-8 stroke-[3]" />
              </div>

              <div className="space-y-2">
                <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1 uppercase tracking-wider">
                  Order Confirmed
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  Order #{completedOrder.orderNumber}
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Your order for <strong className="text-slate-900">{completedOrder.quantity}x {completedOrder.product.name}</strong> has been secured in our system.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-left space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Application:</span>
                  <span className="font-extrabold text-slate-900">{completedOrder.usageType} LPG</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Order Type:</span>
                  <span className="font-bold text-slate-900">{completedOrder.orderType.replace(/_/g, " ")}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Delivery Window:</span>
                  <span className="font-bold text-slate-900">{completedOrder.deliveryDate} ({completedOrder.deliveryTimeSlot})</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Total Paid/Amount:</span>
                  <span className="font-black text-primary text-base">{gbp(completedOrder.total)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="font-extrabold text-emerald-700">{completedOrder.paymentStatus}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  to="/account/orders"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
                >
                  <Truck className="h-4 w-4" />
                  <span>Track Order in Customer Portal</span>
                </Link>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(0);
                    setUsageType(null);
                    setCompletedOrder(null);
                  }}
                  className="w-full sm:w-auto rounded-full px-6 py-3 font-bold border-slate-300 text-slate-700"
                >
                  Order Another Cylinder
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* GAS CUSTOMER APPLICATION MODAL (ONE-TIME ONBOARDING FOR NEW CUSTOMERS) */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-3xl rounded-3xl p-6 sm:p-8 bg-white max-h-[92vh] overflow-y-auto space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-extrabold text-xs uppercase tracking-wider">
              <FileSignature className="h-4 w-4" />
              <span>Mandatory Customer Onboarding</span>
            </div>
            <DialogTitle className="font-black text-xl sm:text-2xl text-slate-900">
              Complete Your Gas Customer Application
            </DialogTitle>
            <p className="text-xs sm:text-sm text-slate-500 text-left">
              To comply with UK Gas Safety and Pressure Systems regulations, please complete and digitally sign your customer application once before placing your first gas order.
            </p>
          </DialogHeader>

          <div className="pt-2">
            <GasCustomerApplicationForm
              initialUsage={usageType || "DOMESTIC"}
              embedded
              onSuccess={(savedApp) => {
                setCustomerApp(savedApp);
                setShowApplicationModal(false);
                toast.success("Gas Customer Application verified and saved! Continuing with your order...");
                if (step === 2) {
                  setStep(3); // Proceed to Delivery/Schedule
                } else if (step === 4) {
                  handlePlaceOrder();
                }
              }}
              onCancel={() => setShowApplicationModal(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* PRODUCT DETAIL INFORMATION MODAL */}
      <Dialog open={!!detailProduct} onOpenChange={(open) => !open && setDetailProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl bg-white border border-slate-200/90 shadow-2xl">
          {detailProduct && (
            <div>
              <DialogHeader className="sr-only">
                <DialogTitle>{detailProduct.name}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-12">
                {/* Left Column: Image & Gallery */}
                <div className="md:col-span-5 bg-gradient-to-b from-slate-50 to-slate-100/60 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 relative">
                  {/* Category / Gas Tag */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <Badge className="bg-slate-900 text-white font-extrabold text-[10px] uppercase">
                      {detailProduct.usage_type} LPG
                    </Badge>
                    <span className="text-[11px] font-black text-red-600 uppercase tracking-wider font-sans">
                      {detailProduct.gas_type}
                    </span>
                  </div>

                  {/* Main Large Image */}
                  <div className="relative aspect-square w-full flex items-center justify-center p-4 bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden my-auto">
                    <img
                      src={detailActiveImg || detailProduct.image_url || "/calor-cylinders-studio.jpg"}
                      alt={detailProduct.name}
                      className="max-h-64 sm:max-h-72 w-auto object-contain transition-transform duration-300 hover:scale-105"
                    />
                  </div>

                  {/* Thumbnails Gallery (if > 1 image available) */}
                  {detailProduct.images && detailProduct.images.length > 1 && (
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
                      {detailProduct.images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDetailActiveImg(img)}
                          className={cn(
                            "h-14 w-14 rounded-xl border-2 p-1 bg-white shrink-0 transition-all cursor-pointer",
                            (detailActiveImg || detailProduct.image_url) === img
                              ? "border-primary shadow-xs scale-105"
                              : "border-slate-200/80 hover:border-slate-300 opacity-70 hover:opacity-100"
                          )}
                        >
                          <img src={img} alt={`Thumbnail ${idx + 1}`} className="h-full w-full object-contain" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Trust Footer */}
                  <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Direct Stayte Delivery</span>
                    </div>
                    <span className="text-slate-400">Genuine {detailProduct.brand || "Calor"}</span>
                  </div>
                </div>

                {/* Right Column: Information, Specs & Actions */}
                <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6 text-left">
                  <div className="space-y-4">
                    {/* Brand & Size */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-600">
                        <span>{detailProduct.brand || "CALOR"}</span>
                        <span>•</span>
                        <span>{detailProduct.cylinder_size || "CYLINDER SUPPLY"}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight font-display">
                        {detailProduct.name}
                      </h3>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex flex-wrap items-baseline gap-3 pb-3 border-b border-slate-100">
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                        {gbp(detailProduct.price)}
                      </div>
                      <span className="text-xs font-semibold text-slate-400">inc. VAT</span>
                      {detailProduct.stock > 0 ? (
                        <Badge variant="outline" className="ml-auto bg-emerald-50 text-emerald-700 border-emerald-200 font-extrabold text-[11px]">
                          In Stock for Fast Delivery
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="ml-auto bg-amber-50 text-amber-700 border-amber-200 font-extrabold text-[11px]">
                          Available to Order
                        </Badge>
                      )}
                    </div>

                    {/* Description */}
                    {detailProduct.description && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                        {detailProduct.description}
                      </p>
                    )}

                    {/* Key Features (Render only if present in record) */}
                    {detailProduct.features && detailProduct.features.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans">
                          Key Features
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {detailProduct.features.map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suitable For / Recommended Uses (Render only if present in record) */}
                    {detailProduct.suitable_for && detailProduct.suitable_for.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-sans">
                          Suitable For / Recommended Uses
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {detailProduct.suitable_for.map((useItem, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1"
                            >
                              <Flame className="h-3 w-3 text-red-500" />
                              {useItem}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity & CTA Buttons */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-700">Order Quantity:</span>
                      <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/90 rounded-xl p-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-slate-700 font-bold hover:bg-white"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-black text-sm text-slate-900">{quantity}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-slate-700 font-bold hover:bg-white"
                          onClick={() => setQuantity((q) => q + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDetailProduct(null)}
                        className="rounded-full px-5 py-3 h-12 font-bold text-xs text-slate-600 border-slate-200 hover:bg-slate-50"
                      >
                        Back
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId(detailProduct.id);
                          setDetailProduct(null);
                          setStep(2); // Continue to Step 3 (New vs Refill)
                          toast.success(`Selected ${detailProduct.name}`);
                        }}
                        className="flex-1 rounded-full py-3.5 h-12 bg-[#c8102e] hover:bg-[#a50d24] text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <span>Select Product & Continue</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AUTHENTICATION MODAL */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white space-y-4">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-slate-900">
              {authMode === "login" ? "Sign In to Your Account" : "Create a Customer Account"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleInlineAuth} className="space-y-4 text-xs text-left">
            {authMode === "register" && (
              <div className="space-y-1">
                <Label className="font-bold text-slate-700">Full Name *</Label>
                <Input
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. David Clarke"
                  className="rounded-xl h-10 text-xs"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Email Address *</Label>
              <Input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="e.g. david.clarke@example.com"
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="font-bold text-slate-700">Password *</Label>
              <Input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl h-10 text-xs"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-full h-11 bg-primary text-white font-extrabold text-xs shadow-md"
            >
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : authMode === "login" ? (
                "Sign In & Continue"
              ) : (
                "Create Account & Continue"
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                {authMode === "login"
                  ? "Don't have an account? Create one"
                  : "Already have an account? Sign In"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
