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
  Car,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { getCustomerGasApplication, GasCustomerApplication } from "@/lib/application-service";
import { GasCustomerApplicationForm } from "@/components/customer/GasCustomerApplicationForm";
import { getActiveDepositForProduct } from "@/lib/cylinder-deposit-service";
import { isRefillableLpgCylinderProduct } from "@/lib/cylinder-exchange-service";
import { OrderGasCatalogueSection, resolveBrandToCategoryId } from "@/components/site/OrderGasCatalogueSection";
import { ProductDetailsModal } from "@/components/site/ProductDetailsModal";
import { DistributorBrandBanners } from "@/components/site/DistributorBrandBanners";
import { OrderGasHeroNetworkMesh } from "@/components/site/OrderGasHeroNetworkMesh";
import { OrderGasShopByCategory } from "@/components/site/OrderGasShopByCategory";
import { OrderGasReveal3D } from "@/components/site/OrderGasReveal3D";
import { speakLoginError, speakLoginSuccess } from "@/lib/auth-voice";

export const Route = createFileRoute("/order-gas")({
  validateSearch: (search: Record<string, unknown>): { brand?: string; category?: string; usage?: string } => {
    return {
      brand: typeof search.brand === "string" ? search.brand : undefined,
      category: typeof search.category === "string" ? search.category : undefined,
      usage: typeof search.usage === "string" ? search.usage : undefined,
    };
  },
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

function PayPalIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.79.79 0 0 1 .78-.667h6.544c3.483 0 5.86 1.77 5.308 5.263-.48 3.036-2.585 4.887-5.59 4.887H9.284l-.946 5.986a.641.641 0 0 1-.633.535l-.629.613z"
        fill="#003087"
      />
      <path
        d="M8.338 18.73h3.045c2.618 0 4.673-1.613 5.09-4.258.416-2.645-1.393-4.257-4.01-4.257H8.927l-1.637 10.362a.555.555 0 0 0 .548.653h.5z"
        fill="#0079C1"
      />
      <path
        d="M16.473 14.472c.417-2.645-1.393-4.257-4.01-4.257H8.927l-.455 2.883h3.991c2.193 0 3.738 1.157 3.414 3.208-.23 1.458-1.282 2.29-2.73 2.502.383-.347.7-.822.846-1.423a5.53 5.53 0 0 0 .48-2.913z"
        fill="#00457C"
      />
    </svg>
  );
}

function OrderGasPage() {
  const { user, login, register } = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();

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

  // Step 0: Usage Type & Catalogue Category
  const [usageType, setUsageType] = useState<UsageType | null>(null);
  const [selectedCatalogueCategory, setSelectedCatalogueCategory] = useState<string | null>(null);

  // Sync brand or category search param from URL (e.g. /order-gas?brand=Calor or /order-gas?brand=Air%20Liquide)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncSearchParams = () => {
      const params = new URLSearchParams(window.location.search);
      const brandParam = search?.brand || params.get("brand");
      const categoryParam = search?.category || params.get("category");

      if (brandParam) {
        const targetCategory = resolveBrandToCategoryId(brandParam);
        setStep(0);
        setSelectedCatalogueCategory(targetCategory);

        const performScroll = () => {
          const mainEl = document.getElementById("gas-catalogue-main");
          if (mainEl) {
            mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        };

        performScroll();
        const t1 = setTimeout(performScroll, 80);
        const t2 = setTimeout(performScroll, 250);
        const t3 = setTimeout(performScroll, 600);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      } else if (categoryParam) {
        setStep(0);
        setSelectedCatalogueCategory(categoryParam);
        const performScroll = () => {
          const mainEl = document.getElementById("gas-catalogue-main");
          if (mainEl) {
            mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        };
        performScroll();
        const t1 = setTimeout(performScroll, 100);
        return () => clearTimeout(t1);
      }
    };

    syncSearchParams();
  }, [search?.brand, search?.category]);

  // Sync section hash from URL (e.g., #garden, #food, #trailers, #workwear, #gas, #pub-gas)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncHash = () => {
      const hash = (window.location.hash || "").replace("#", "").toLowerCase().trim();
      if (!hash || hash === "shop-by-brand") return;

      const HASH_MAP: Record<string, string> = {
        gas: "calor-gas",
        "calor-gas": "calor-gas",
        "pub-gas": "pub-gas",
        pubgas: "pub-gas",
        garden: "garden",
        food: "food",
        trailers: "trailers",
        workwear: "workwear",
        "coal-logs": "coal-fuels",
        "coal-fuels": "coal-fuels",
        coal: "coal-fuels",
        "fishing-baits": "dynamite-baits",
        "fishing-bait": "dynamite-baits",
        "animal-feed": "animal-feed",
        "gas-appliances": "gas-appliances",
        "gas-spares": "gas-spares",
        "air-liquide": "air-liquide",
      };

      const target = HASH_MAP[hash] || hash;
      setStep(0);
      setSelectedCatalogueCategory(target);
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  // Step 1: Product & Quantity
  const [products, setProducts] = useState<GasProductRecord[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productFetchError, setProductFetchError] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductOverride, setSelectedProductOverride] = useState<GasProductRecord | null>(null);
  const [selectedFromCatalogue, setSelectedFromCatalogue] = useState<boolean>(false);
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

  const [notes, setNotes] = useState<string>("");

  // Step 4 & 5: Summary & Payment
  const [paymentMethod, setPaymentMethod] = useState<string>("Credit / Debit Card");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvc, setCardCvc] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [submittingOrder, setSubmittingOrder] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Sync cardholder name when customerName or user changes
  useEffect(() => {
    if (customerName && !cardholderName) {
      setCardholderName(customerName);
    } else if (user?.name && !cardholderName) {
      setCardholderName(user.name);
    }
  }, [customerName, user]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardCvc(raw);
  };

  // Inline Auth Modal for unauthenticated guests
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Rotating animated hero headline messages (5 Editorial Phrases Stack)
  const ROTATING_HERO_PHRASES = [
    "POWERING HOMES",
    "POWERING BUSINESSES",
    "POWERING GLOUCESTERSHIRE",
    "POWERING A CLEANER TOMORROW",
    "KEEPING YOU MOVING",
  ];
  const [activePhraseIndex, setActivePhraseIndex] = useState<number>(0); // Starts at POWERING HOMES

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhraseIndex((prev) => (prev + 1) % ROTATING_HERO_PHRASES.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [ROTATING_HERO_PHRASES.length]);

  // CMS data from Supabase
  const [shopGasCms, setShopGasCms] = useState({
    heroEyebrow: "OFFICIAL CALOR GAS DISTRIBUTOR",
    heroHeading: "ORDER GAS CYLINDERS & REFILLS",
    heroSubtitle: "Order domestic heating, commercial appliances, and bulk forecourt LPG supplies across Gloucestershire.",
    operationalBanner: "Next-Day Delivery available on orders placed before 12:00 PM across Gloucestershire.",
  });

  useEffect(() => {
    async function loadShopCms() {
      try {
        const { data } = await supabase
          .from("cms_content_blocks")
          .select("content")
          .eq("section_key", "shop_order_gas_data")
          .maybeSingle();

        if (data?.content) {
          try {
            const parsed = JSON.parse(data.content);
            if (parsed && typeof parsed === "object") {
              setShopGasCms((prev) => ({
                ...prev,
                heroEyebrow: parsed.heroEyebrow || prev.heroEyebrow,
                heroHeading: parsed.heroHeading || prev.heroHeading,
                heroSubtitle: parsed.heroSubtitle || prev.heroSubtitle,
                operationalBanner: parsed.operationalBanner || prev.operationalBanner,
              }));
            }
          } catch { }
        }
      } catch (err) {
        console.warn("Failed to load shop CMS block:", err);
      }
    }
    loadShopCms();

    const handleUpdate = () => loadShopCms();
    window.addEventListener("cms_shop_updated", handleUpdate);
    return () => window.removeEventListener("cms_shop_updated", handleUpdate);
  }, []);

  // Real Typewriter effect for main hero heading
  const MAIN_HEADING_TEXT = shopGasCms.heroHeading || "ORDER GAS CYLINDERS & REFILLS";
  const [typedHeading, setTypedHeading] = useState<string>("");
  const [isDeletingHeading, setIsDeletingHeading] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeletingHeading) {
      if (typedHeading.length < MAIN_HEADING_TEXT.length) {
        timer = setTimeout(() => {
          setTypedHeading(MAIN_HEADING_TEXT.slice(0, typedHeading.length + 1));
        }, 70);
      } else {
        // Full heading typed, pause briefly before erasing
        timer = setTimeout(() => {
          setIsDeletingHeading(true);
        }, 2200);
      }
    } else {
      if (typedHeading.length > 0) {
        timer = setTimeout(() => {
          setTypedHeading(MAIN_HEADING_TEXT.slice(0, typedHeading.length - 1));
        }, 35);
      } else {
        // Reset complete, pause briefly before typing again
        timer = setTimeout(() => {
          setIsDeletingHeading(false);
        }, 400);
      }
    }

    return () => clearTimeout(timer);
  }, [typedHeading, isDeletingHeading, MAIN_HEADING_TEXT]);

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
        setSelectedProductId((prev) => {
          if (prev && loaded.some((p) => p.id === prev || p.slug === prev)) return prev;
          if (selectedProductOverride && loaded.some((p) => p.id === selectedProductOverride.id || p.slug === selectedProductOverride.slug)) {
            return loaded.find((p) => p.id === selectedProductOverride.id || p.slug === selectedProductOverride.slug)!.id;
          }
          return prev || loaded[0].id;
        });
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

    const channel = supabase
      .channel(`customer-order-gas-sync-${usageType}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProductsForUsage(usageType);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [usageType]);

  // Load available delivery slots from backend
  useEffect(() => {
    async function loadSlots() {
      const today = new Date().toISOString().split("T")[0];
      const delSlots = await getAvailableSlots({ type: "delivery", date: deliveryDate || today });
      setAvailableDeliverySlots(delSlots);
      if (delSlots.length > 0 && !selectedDeliverySlot) {
        setSelectedDeliverySlot(delSlots[0].slot.slot_name);
      }
    }
    loadSlots();
  }, [deliveryDate]);

  const selectedProduct =
    products.find((p) => p.id === selectedProductId || p.slug === selectedProductId) ||
    (selectedProductOverride && (selectedProductOverride.id === selectedProductId || selectedProductOverride.slug === selectedProductId || !products.length)
      ? selectedProductOverride
      : null) ||
    selectedProductOverride ||
    products[0];

  // Dynamic Supabase-backed deposit state
  const [dynamicDeposit, setDynamicDeposit] = useState<{
    amount: number;
    isConfigured: boolean;
    loading: boolean;
  }>({ amount: 0, isConfigured: false, loading: false });

  useEffect(() => {
    if (!selectedProduct?.id) return;
    let isMounted = true;
    setDynamicDeposit((prev) => ({ ...prev, loading: true }));
    getActiveDepositForProduct(selectedProduct.id).then((res) => {
      if (isMounted) {
        setDynamicDeposit({
          amount: res.depositAmount,
          isConfigured: res.isConfigured,
          loading: false,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedProduct?.id]);

  // Pricing calculation
  const isCylinderProduct = selectedProduct ? isRefillableLpgCylinderProduct(selectedProduct) : true;
  const isNew = orderType === "NEW_CYLINDER";
  const gasPriceUnit = selectedProduct
    ? isNew
      ? selectedProduct.price
      : selectedProduct.refill_price ?? selectedProduct.price
    : 0;
  const depositUnit = isNew && selectedProduct && isCylinderProduct ? dynamicDeposit.amount : 0;
  const gasTotal = gasPriceUnit * quantity;
  const depositTotal = depositUnit * quantity;
  const deliveryFee = selectedProduct?.delivery_charge || 0;
  const totalAmount = gasTotal + depositTotal + deliveryFee;

  // Scroll directly to the active order step section accounting for sticky navbar
  const scrollToStepSection = (targetStep?: number) => {
    // Run after React state commits and DOM renders
    requestAnimationFrame(() => {
      setTimeout(() => {
        const stepTarget =
          (targetStep !== undefined ? document.getElementById(`order-gas-step-${targetStep}`) : null) ||
          document.getElementById("order-wizard-step-container");

        if (stepTarget) {
          stepTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          const container = document.getElementById("order-wizard-step-container");
          if (container) {
            container.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 60);
    });
  };

  // Step 0: Usage selection handler
  const handleSelectUsage = (type: UsageType) => {
    setUsageType(type);
    setSelectedFromCatalogue(false);
    setStep(1); // Proceed to choose product
    scrollToStepSection(1);
  };

  // Step 1: Product selection handler
  const handleNextFromProduct = () => {
    if (!selectedProduct) return toast.error("Please choose a product or service.");
    if (!isCylinderProduct || usageType === "AUTOGAS") {
      // Autogas and non-cylinder products bypass New / Refill exchange
      setOrderType("NEW_CYLINDER");
      setStep(3);
      scrollToStepSection(3);
      return;
    }
    setStep(2); // Proceed to New vs Refill
    scrollToStepSection(2);
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
    scrollToStepSection(3);
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
    setStep(4); // Proceed to Order Summary & Payment
    scrollToStepSection(4);
  };

  // Inline auth handler
  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      if (!authEmail || !authEmail.includes("@")) {
        speakLoginError("wrong email", authEmail);
      } else {
        speakLoginError("Sign in failed. Please check your details and try again.", authEmail);
      }
      return toast.error("Email and password are required.");
    }
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        const res = await login(authEmail, authPassword);
        if (!res.ok) {
          speakLoginError(res.error, authEmail);
          throw new Error(res.error || "Invalid credentials.");
        }
        speakLoginSuccess(res.user?.role);
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
      speakLoginError(err.message, authEmail);
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

    const isCard = paymentMethod.toLowerCase().includes("card");
    const isPayPal = paymentMethod.toLowerCase().includes("paypal");

    if (isCard) {
      if (!cardholderName.trim()) {
        return toast.error("Please enter the cardholder name.");
      }
      const rawCard = cardNumber.replace(/\s+/g, "");
      if (rawCard.length < 15) {
        return toast.error("Please enter a valid 16-digit card number.");
      }
      const [expMonth, expYear] = cardExpiry.split("/");
      if (!expMonth || !expYear || Number(expMonth) < 1 || Number(expMonth) > 12) {
        return toast.error("Please enter a valid card expiry date (MM/YY).");
      }
      if (cardCvc.length < 3) {
        return toast.error("Please enter a valid 3 or 4 digit security code (CVC).");
      }
    }

    setSubmittingOrder(true);
    if (isCard || isPayPal) {
      setIsProcessingPayment(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setIsProcessingPayment(false);
    }

    try {
      const normalizedMethod = isPayPal
        ? "PayPal"
        : isCard
          ? "Credit / Debit Card"
          : "Pay on Delivery / Collection";

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
        returnMethod: orderType === "REFILL_EXCHANGE" ? "RETURN_ON_DELIVERY" : undefined,
        cylinderTag: cylinderTag.trim() || undefined,
        notes: notes.trim() || undefined,
        paymentMethod: normalizedMethod,
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
        paymentMethod: normalizedMethod,
        paymentStatus: isCard || isPayPal ? "Paid" : "Pending",
      });

      setStep(5); // Step 5: Confirmation
      scrollToStepSection(5);
      toast.success(`Order #${res.orderNumber} placed successfully!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order.");
    } finally {
      setSubmittingOrder(false);
      setIsProcessingPayment(false);
    }
  };

  return (
    <SiteLayout>
      <div className="bg-[#fcfdfe] min-h-[85vh] border-b border-slate-200/60">
        {/* ========================================================================= */}
        {/* 1. FULL-WIDTH IMMERSIVE CINEMATIC DARK 3D HERO SECTION */}
        {/* ========================================================================= */}
        <section className="relative w-full overflow-hidden bg-[#080b11] py-8 sm:py-10 md:py-14 min-h-[580px] sm:min-h-[620px] lg:min-h-[640px] flex items-center border-b border-slate-800/80 shadow-2xl">
          <OrderGasHeroNetworkMesh />

          <div className="container-page max-w-[88rem] px-3.5 sm:px-6 relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">

              {/* Left Column: Badge, Editorial Headline Stack, Main Title, Description & Trust Badges */}
              <div className="lg:col-span-6 xl:col-span-6 space-y-4 sm:space-y-5 text-left flex flex-col items-start">

                {/* Official Calor Distributor Badge (Dark Theme) */}
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/50 backdrop-blur-md px-3 sm:px-3.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-[0.2em] text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                  <span>{shopGasCms.heroEyebrow || "OFFICIAL CALOR GAS DISTRIBUTOR"}</span>
                </div>

                {/* Main Hero Title with Real Typewriter Animation in JSS Red */}
                <div className="relative pt-1 select-none w-full">
                  {/* Invisible Ghost Header: Strictly locks dimensions to prevent layout shifts while typing */}
                  <h1
                    aria-hidden="true"
                    className="text-xl sm:text-3xl md:text-4xl lg:text-[44px] xl:text-[46px] font-black text-transparent tracking-tight leading-[1.1] font-display uppercase pointer-events-none opacity-0 select-none break-words"
                  >
                    {shopGasCms.heroHeading || "ORDER GAS CYLINDERS & REFILLS"}
                  </h1>

                  {/* Real Letter-by-Letter Animated Typed Heading in Pure White (No Cursor) */}
                  <h1
                    className="absolute top-0 left-0 right-0 pt-1 text-xl sm:text-3xl md:text-4xl lg:text-[44px] xl:text-[46px] font-black text-white tracking-tight leading-[1.1] font-display uppercase break-words"
                    aria-label={shopGasCms.heroHeading || "ORDER GAS CYLINDERS & REFILLS"}
                  >
                    {typedHeading}
                  </h1>
                </div>

                {/* Animated Editorial Vertical Headline Stack (Matching Reference) */}
                <div className="space-y-1 sm:space-y-1.5 py-1 select-none w-full">
                  {ROTATING_HERO_PHRASES.map((phrase, idx) => {
                    const isActive = idx === activePhraseIndex;
                    return (
                      <div
                        key={phrase}
                        className={cn(
                          "transition-all duration-300 ease-out flex items-center",
                          isActive
                            ? "border-l-[3.5px] border-red-600 pl-3 sm:pl-4 text-white font-black text-lg min-[380px]:text-xl sm:text-2xl md:text-3xl lg:text-[34px] tracking-tight leading-tight uppercase scale-100"
                            : "pl-3 sm:pl-4 text-slate-500/50 hover:text-slate-400 font-extrabold text-xs min-[380px]:text-sm sm:text-base lg:text-lg tracking-wider uppercase scale-[0.98] origin-left",
                        )}
                      >
                        <span className="break-words">{phrase}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Supporting Description */}
                <p className="text-xs sm:text-sm md:text-base text-slate-300 font-normal leading-relaxed max-w-xl">
                  {shopGasCms.heroSubtitle ||
                    "Order domestic heating, commercial appliances, and bulk forecourt LPG supplies across Gloucestershire."}
                </p>

                {/* Trust & Service Highlights Row */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-7 pt-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-950/70 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] shrink-0">
                      <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs sm:text-sm font-bold text-white leading-tight">Reliable Local Delivery</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400">Across Gloucestershire</p>
                    </div>
                  </div>

                  <div className="w-[1px] h-7 bg-slate-800 hidden sm:block" />

                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-red-950/70 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] shrink-0">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs sm:text-sm font-bold text-white leading-tight">Trusted Brands</p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400">Calor &amp; Air Liquide</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: 3D Floating Brand Visuals (Calor & Air Liquide) */}
              <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end w-full pt-4 lg:pt-0">
                <DistributorBrandBanners />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. SHOP BY CATEGORY (All Non-Empty Sidebar Categories) */}
        {/* ========================================================================= */}
        <OrderGasShopByCategory
          onSelectCategory={(catId) => {
            setSelectedCatalogueCategory(catId);
            setStep(0);
            const el = document.getElementById("gas-catalogue-main");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          activeCategoryId={selectedCatalogueCategory || undefined}
        />

        {/* ========================================================================= */}
        {/* 3. ORDERING STEPS & PRODUCT CATALOGUE */}
        {/* ========================================================================= */}
        <div
          id="order-wizard-step-container"
          className="container-page max-w-[88rem] px-2 sm:px-3.5 lg:px-4 py-6 sm:py-10 space-y-6 sm:space-y-8 scroll-mt-24 sm:scroll-mt-28"
        >
          {/* Stepper Indicator with 3D Scroll Reveal */}
          {step < 5 && (
            <OrderGasReveal3D translateY={18} rotateX={4} scale={0.98} duration={700}>
              <nav aria-label="Progress" className="w-full">
                <ol className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-5 gap-2 sm:gap-2.5 lg:gap-3">
                  {[
                    {
                      title: "1. Usage Type",
                      desc: usageType ? (usageType === "AUTOGAS" ? "Autogas" : usageType) : "Select Usage",
                    },
                    {
                      title: "2. Gas & Cylinder",
                      desc: selectedProduct ? selectedProduct.name.slice(0, 18) + "..." : "Pick Size",
                    },
                    {
                      title: "3. New / Refill",
                      desc:
                        usageType === "AUTOGAS" || !isCylinderProduct
                          ? "Direct Order"
                          : orderType === "NEW_CYLINDER"
                            ? "New Purchase"
                            : "Refill Exchange",
                    },
                    { title: "4. Schedule & Address", desc: "Delivery Slot" },
                    { title: "5. Review & Pay", desc: "Order Total" },
                  ].map((s, idx) => {
                    const isActive = step === idx;
                    const isComplete = step > idx;
                    const isBypassed = idx === 2 && (usageType === "AUTOGAS" || !isCylinderProduct);
                    return (
                      <li key={s.title} className="w-full last:col-span-1 min-[420px]:last:col-span-2 md:last:col-span-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (idx < step && !isBypassed) {
                              setStep(idx);
                              scrollToStepSection(idx);
                            }
                          }}
                          disabled={idx > step || isBypassed}
                          className={cn(
                            "w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border text-xs font-extrabold transition-all text-left",
                            isActive
                              ? "border-primary bg-primary text-white shadow-md"
                              : isComplete
                                ? "border-slate-300 bg-white text-slate-900 hover:border-slate-400 shadow-2xs cursor-pointer"
                                : isBypassed
                                  ? "border-slate-200 bg-slate-100/60 text-slate-400 cursor-not-allowed opacity-60"
                                  : "border-slate-200/80 bg-slate-50 text-slate-400 cursor-not-allowed",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-black",
                              isActive
                                ? "bg-white/20 text-white"
                                : isComplete
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : "bg-slate-200/70 text-slate-500",
                            )}
                          >
                            {isComplete ? (
                              <Check className="h-3 w-3 stroke-[3]" />
                            ) : (
                              <span>{idx + 1}</span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate leading-tight font-extrabold">{s.title}</p>
                            <p
                              className={cn(
                                "text-[10px] font-normal truncate",
                                isActive ? "text-white/80" : "text-slate-500",
                              )}
                            >
                              {s.desc}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </OrderGasReveal3D>
          )}

          {/* ========================================================================= */}
          {/* STEP 0: CHOOSE USAGE (LANDING PAGE - FIRST VIEW) */}
          {/* ========================================================================= */}
          {step === 0 && (
            <div id="order-gas-step-0" className="space-y-12 text-left scroll-mt-24 sm:scroll-mt-28">
              {/* FIRST SECTION: CATALOGUE & CATEGORY BROWSING (PRODUCTS LISTING FIRST) */}
              <OrderGasCatalogueSection
                selectedCategoryOverride={selectedCatalogueCategory}
                onSelectCategoryChange={(catId) => {
                  setSelectedCatalogueCategory(catId);
                }}
                onSelectGasProduct={(productId, usage, productObj, qty) => {
                  const uType = usage || "DOMESTIC";
                  setUsageType(uType);
                  setSelectedProductId(productId);
                  setSelectedFromCatalogue(true);
                  if (qty) setQuantity(qty);

                  if (productObj) {
                    const formattedObj: GasProductRecord = {
                      id: productObj.id || productId,
                      name: productObj.name,
                      slug: productObj.slug || productId,
                      brand: productObj.brand || "Calor",
                      category_slug: productObj.category_slug || "gas",
                      subcategory: productObj.subcategory || null,
                      description: productObj.description || "",
                      price: productObj.price || 0,
                      stock: productObj.stock ?? 30,
                      image_url: productObj.image_url || productObj.image || "/calor-cylinders-studio.jpg",
                      images: productObj.images || [productObj.image_url || productObj.image || "/calor-cylinders-studio.jpg"],
                      usage_type: uType,
                      gas_type: productObj.gas_type || (productObj.name?.toLowerCase().includes("butane") ? "Butane" : productObj.name?.toLowerCase().includes("propane") ? "Propane" : "LPG"),
                      cylinder_size: productObj.cylinder_size || (productObj.specs?.cylinder_size || ""),
                      deposit_price: productObj.deposit_price ?? 39.99,
                      refill_price: productObj.refill_price ?? productObj.price ?? 0,
                      delivery_charge: productObj.delivery_charge || 0,
                      is_active: true,
                      specs: productObj.specs || {},
                    };
                    setSelectedProductOverride(formattedObj);
                  }

                  const isCyl = productObj
                    ? isRefillableLpgCylinderProduct(productObj) && uType !== "AUTOGAS"
                    : uType !== "AUTOGAS";

                  const nextStep = !isCyl ? 3 : 2;
                  if (!isCyl) {
                    setOrderType("NEW_CYLINDER");
                    setStep(3);
                  } else {
                    setStep(2); // Go directly to Step 2 (3. Refill Option)
                  }

                  scrollToStepSection(nextStep);
                }}
                onViewProductDetail={(prod) => {
                  setDetailProduct(prod as any);
                }}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: CHOOSE GAS / CYLINDER (Strictly Backend Filtered by Usage) */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div id="order-gas-step-1" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 scroll-mt-24 sm:scroll-mt-28">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-slate-900 text-white font-extrabold text-[10px] uppercase">
                      {usageType === "DOMESTIC"
                        ? "Domestic LPG"
                        : usageType === "COMMERCIAL"
                          ? "Commercial LPG"
                          : usageType === "BULK"
                            ? "Bulk LPG & Tanks"
                            : "Vehicle LPG / Autogas"}
                    </Badge>
                    {products.length > 0 && (
                      <span className="text-xs text-slate-400 font-bold">
                        ({products.length} {products.length === 1 ? "Product" : "Products"}{" "}
                        Available)
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display mt-1">
                    {usageType === "AUTOGAS"
                      ? "Select Your Vehicle LPG / Autogas Service or Product"
                      : "Select Your Gas Cylinder / Supply"}
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
                    <span className="w-8 text-center font-black text-sm text-slate-900">
                      {quantity}
                    </span>
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
                    <p className="text-base font-bold text-slate-800">
                      We couldn’t load the available gas products.
                    </p>
                    <p className="text-xs text-slate-500">
                      Please check your connection and try again.
                    </p>
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
                  <p className="text-base font-bold text-slate-800">
                    No products are currently available
                  </p>
                  <p className="text-xs text-slate-500">
                    Please try another gas type or contact us for assistance.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {products.map((p) => {
                    const isSelected = selectedProductId === p.id;
                    const productImage =
                      p.image_url || p.images?.[0] || "/calor-cylinders-studio.jpg";
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setDetailProduct(p);
                          setDetailActiveImg(productImage);
                        }}
                        className={cn(
                          "rounded-3xl border bg-white overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between text-left relative group cursor-pointer",
                          isSelected
                            ? "border-primary ring-2 ring-primary/20 shadow-md"
                            : "border-slate-200/80",
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
                              <span className="font-bold text-slate-700">
                                {p.cylinder_size || p.gas_type}
                              </span>
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
                  <span>
                    {usageType === "AUTOGAS" || (selectedProduct && !isCylinderProduct)
                      ? "Continue to Scheduling"
                      : "Continue to Order Type"}
                  </span>
                  <ChevronRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: NEW CYLINDER VS REFILL / EXCHANGE */}
          {/* ========================================================================= */}
          {step === 2 && selectedProduct && (
            <div id="order-gas-step-2" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 max-w-4xl mx-auto scroll-mt-24 sm:scroll-mt-28">
              <div className="text-left space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  Do you have an empty cylinder to exchange?
                </h2>
                <p className="text-sm text-slate-500">
                  You selected: <strong className="text-slate-900 font-extrabold">{selectedProduct.name}</strong>. Please confirm whether you have an empty cylinder to return.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Option 1: Refill / Exchange */}
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("REFILL_EXCHANGE");
                    setConfirmedHasEmpty(true);
                  }}
                  className={cn(
                    "p-6 rounded-3xl border text-left transition-all cursor-pointer space-y-4 relative group",
                    orderType === "REFILL_EXCHANGE"
                      ? "border-primary ring-2 ring-primary/20 bg-red-50/20 shadow-md"
                      : "border-slate-200/90 bg-white hover:border-slate-300",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <RotateCcw className="h-6 w-6" />
                    </div>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                        orderType === "REFILL_EXCHANGE"
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white group-hover:border-slate-400",
                      )}
                    >
                      {orderType === "REFILL_EXCHANGE" && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">
                        Yes – Refill / Exchange
                      </h3>
                      <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                        EXCHANGE
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      I have an empty Calor cylinder to exchange. Zero cylinder deposit charge applies.
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gas Content:</span>
                      <span className="font-bold">{gbp(selectedProduct.refill_price ?? selectedProduct.price)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Deposit Fee:</span>
                      <span>£0.00 (Exchanged)</span>
                    </div>
                  </div>
                </button>

                {/* Option 2: New Cylinder */}
                <button
                  type="button"
                  onClick={() => setOrderType("NEW_CYLINDER")}
                  className={cn(
                    "p-6 rounded-3xl border text-left transition-all cursor-pointer space-y-4 relative group",
                    orderType === "NEW_CYLINDER"
                      ? "border-primary ring-2 ring-primary/20 bg-red-50/20 shadow-md"
                      : "border-slate-200/90 bg-white hover:border-slate-300",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <PackagePlus className="h-6 w-6" />
                    </div>
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border flex items-center justify-center transition-all",
                        orderType === "NEW_CYLINDER"
                          ? "border-primary bg-primary text-white"
                          : "border-slate-300 bg-white group-hover:border-slate-400",
                      )}
                    >
                      {orderType === "NEW_CYLINDER" && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900">
                        No – New Cylinder
                      </h3>
                      <Badge className="bg-blue-600 text-white font-extrabold text-[10px]">
                        NEW BOTTLE
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      I need a new cylinder (adds refundable security deposit).
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gas Content:</span>
                      <span className="font-bold">{gbp(selectedProduct.price)}</span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-bold">
                      <span>Security Deposit:</span>
                      <span>+{gbp(dynamicDeposit.amount || selectedProduct.deposit_price || 39.99)}</span>
                    </div>
                  </div>
                </button>
              </div>

              {/* Selected Product Summary Banner with thumbnail and Change product link */}
              <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={selectedProduct.image_url || selectedProduct.images?.[0] || "/calor-cylinders-studio.jpg"}
                    alt={selectedProduct.name}
                    className="h-12 w-12 shrink-0 object-contain rounded-xl bg-white p-1 border border-slate-200"
                  />
                  <div className="text-left min-w-0">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug truncate">
                      {selectedProduct.name}
                    </h4>
                    <div className="font-bold text-xs text-slate-600 mt-0.5">
                      {gbp(orderType === "REFILL_EXCHANGE" ? (selectedProduct.refill_price ?? selectedProduct.price) : selectedProduct.price)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    scrollToStepSection(1);
                  }}
                  className="text-xs font-bold text-primary hover:underline hover:text-red-700 cursor-pointer shrink-0 ml-3"
                >
                  Change product
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
                        Return your empty cylinder when receiving your refill. An empty bottle of
                        equivalent group/size must be available for collection before your refilled
                        bottle is completed.
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

                  {/* Empty Cylinder Collection Notice (Exchange on Delivery) */}
                  <div className="p-3 rounded-2xl bg-amber-100/70 border border-amber-300 text-xs space-y-1">
                    <Label className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-amber-700" />
                      Collection on Normal Delivery Handover
                    </Label>
                    <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                      Our delivery driver will collect your matching empty cylinder when delivering your full replacement bottle.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const target = selectedFromCatalogue ? 0 : 1;
                    setStep(target);
                    scrollToStepSection(target);
                  }}
                  className="rounded-full px-6 py-2.5 h-11 font-bold text-slate-700 cursor-pointer"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  onClick={handleNextFromOrderType}
                  className="rounded-full px-8 py-3 bg-[#c8102e] hover:bg-[#a50d24] text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer h-12"
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
            <div id="order-gas-step-3" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 scroll-mt-24 sm:scroll-mt-28">
              <div className="text-left space-y-1">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
                  Choose Delivery Address &amp; Date
                </h2>
                <p className="text-sm text-slate-500">
                  Select your delivery address and preferred date for your <strong className="text-slate-900 font-extrabold">{selectedProduct?.name || "Gas Order"}</strong>.
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
                      <Label className="text-xs font-bold text-slate-700">
                        Choose from Saved Addresses:
                      </Label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedAddressId(val);
                          if (val !== "custom") {
                            const found = savedAddresses.find((a) => a.id === val);
                            if (found) {
                              setDeliveryAddress(
                                `${found.street}, ${found.city} ${found.postcode}`,
                              );
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
                    <Label className="text-xs font-bold text-slate-700">
                      Recipient Full Name *
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. David Clarke"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Contact Telephone Number *
                    </Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 01452 741234 or 07700 900123"
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Delivery Street Address & Postcode *
                    </Label>
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
                    <Label className="text-xs font-bold text-slate-700">
                      Preferred Delivery Date *
                    </Label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="rounded-xl h-11 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Available Delivery Time Slot *
                    </Label>
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
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
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
                          <span
                            className={cn(
                              "text-[10px] font-extrabold px-2 py-0.5 rounded-full",
                              available
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-600",
                            )}
                          >
                            {available ? `${remainingCapacity} slots open` : "Fully Booked"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>



                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Driver Delivery Instructions (Optional)
                    </Label>
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
                  onClick={() => {
                    const target = !isCylinderProduct || usageType === "AUTOGAS"
                      ? selectedFromCatalogue
                        ? 0
                        : 1
                      : 2;
                    setStep(target);
                    scrollToStepSection(target);
                  }}
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
            <div id="order-gas-step-4" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-8 max-w-3xl mx-auto scroll-mt-24 sm:scroll-mt-28">
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
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Application
                    </span>
                    <p className="text-base font-black text-slate-900">
                      {usageType === "AUTOGAS"
                        ? "Vehicle LPG / Autogas"
                        : !isCylinderProduct
                          ? "Direct Order"
                          : `${usageType} LPG Order`}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "text-xs font-extrabold px-3 py-1",
                      usageType === "AUTOGAS" || !isCylinderProduct
                        ? "bg-slate-900 text-white"
                        : isNew
                          ? "bg-blue-600 text-white"
                          : "bg-emerald-600 text-white",
                    )}
                  >
                    {usageType === "AUTOGAS" || !isCylinderProduct
                      ? "DIRECT ORDER"
                      : isNew
                        ? "NEW CYLINDER"
                        : "REFILL EXCHANGE"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-500 font-medium">Selected Product:</span>
                    <p className="font-extrabold text-slate-900">{selectedProduct.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Quantity:</span>
                    <p className="font-extrabold text-slate-900">
                      {quantity} {usageType === "AUTOGAS" || !isCylinderProduct ? "Item(s)" : "Cylinder(s)"}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Recipient:</span>
                    <p className="font-extrabold text-slate-900">
                      {customerName} ({customerPhone})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Delivery Destination:</span>
                    <p className="font-extrabold text-slate-900 truncate">{deliveryAddress}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 font-medium">Delivery Slot:</span>
                    <p className="font-extrabold text-slate-900">
                      {deliveryDate} ({selectedDeliverySlot})
                    </p>
                  </div>
                </div>

                {/* Price Itemization */}
                <div className="border-t border-slate-200 pt-4 space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {isCylinderProduct
                        ? `Gas ${isNew ? "Purchase" : "Refill"} Charge (${quantity}x ${gbp(gasPriceUnit)}):`
                        : `Product Price (${quantity}x ${gbp(gasPriceUnit)}):`}
                    </span>
                    <span className="font-extrabold text-slate-900">{gbp(gasTotal)}</span>
                  </div>

                  {isCylinderProduct && (
                    isNew ? (
                      <div className="flex items-center justify-between text-blue-700 font-semibold bg-blue-50/80 p-2 rounded-xl border border-blue-100">
                        <span>
                          Cylinder Security Deposit ({quantity}x {gbp(depositUnit)}):
                        </span>
                        <span className="font-black">{gbp(depositTotal)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-emerald-700 font-medium bg-emerald-50/80 p-2 rounded-xl border border-emerald-100">
                        <span>Cylinder Deposit (Exchange Policy):</span>
                        <span className="font-extrabold">£0.00 (Exchanged Empty)</span>
                      </div>
                    )
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Gloucestershire Forecourt Delivery:</span>
                    <span className="font-bold text-emerald-600">
                      {deliveryFee === 0 ? "FREE" : gbp(deliveryFee)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base sm:text-lg font-black">
                    <span className="text-slate-900">Total Payable Amount:</span>
                    <span className="text-2xl text-primary">{gbp(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Payment Option
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: "Credit / Debit Card",
                        label: "Credit / Debit Card",
                        subtitle: "Visa, Mastercard, Amex",
                        icon: CreditCard,
                      },
                      {
                        id: "PayPal",
                        label: "PayPal",
                        subtitle: "Fast, secure checkout",
                        icon: PayPalIcon,
                      },
                      {
                        id: "Pay on Delivery / Collection",
                        label: "Pay on Delivery / Collection",
                        subtitle: "Pay driver or at depot",
                        icon: Banknote,
                      },
                    ].map((method) => {
                      const isSelected = paymentMethod === method.id;
                      const IconComp = method.icon;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={cn(
                            "relative flex flex-col text-left p-4 rounded-2xl border transition-all cursor-pointer select-none",
                            isSelected
                              ? method.id === "PayPal"
                                ? "border-[#0079C1] bg-sky-50/40 shadow-sm ring-2 ring-[#0079C1]/20"
                                : method.id === "Credit / Debit Card"
                                  ? "border-primary bg-red-50/30 shadow-sm ring-2 ring-primary/20"
                                  : "border-amber-500 bg-amber-50/30 shadow-sm ring-2 ring-amber-500/20"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-700",
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-xl flex items-center justify-center",
                                isSelected
                                  ? method.id === "PayPal"
                                    ? "bg-[#0079C1]/10 text-[#0079C1]"
                                    : method.id === "Credit / Debit Card"
                                      ? "bg-primary/10 text-primary"
                                      : "bg-amber-500/10 text-amber-700"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <IconComp className="h-4 w-4" />
                            </div>
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border flex items-center justify-center transition-all",
                                isSelected
                                  ? method.id === "PayPal"
                                    ? "border-[#0079C1] bg-[#0079C1] text-white"
                                    : method.id === "Credit / Debit Card"
                                      ? "border-primary bg-primary text-white"
                                      : "border-amber-600 bg-amber-600 text-white"
                                  : "border-slate-300 bg-white",
                              )}
                            >
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-xs font-black text-slate-900">{method.label}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            {method.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Card Inputs if Card Selected */}
                {paymentMethod === "Credit / Debit Card" && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4 text-left shadow-inner/5">
                    <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                          Card Payment Details
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-500">
                        <span>Total:</span>
                        <span className="text-primary font-black">{gbp(totalAmount)}</span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="gas-chn" className="text-xs font-bold text-slate-700">
                        Cardholder Name
                      </Label>
                      <Input
                        id="gas-chn"
                        required
                        maxLength={100}
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        placeholder="Name as printed on card"
                        className="mt-1.5 rounded-xl bg-white text-xs font-medium h-10 border-slate-200"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label htmlFor="gas-cn" className="text-xs font-bold text-slate-700">
                          Card Number
                        </Label>
                        <div className="relative mt-1.5">
                          <Input
                            id="gas-cn"
                            required
                            placeholder="4242 4242 4242 4242"
                            maxLength={19}
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            className="rounded-xl bg-white pl-10 text-xs font-mono font-medium tracking-wider h-10 border-slate-200"
                          />
                          <CreditCard className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="gas-ex" className="text-xs font-bold text-slate-700">
                          Expiry Date
                        </Label>
                        <Input
                          id="gas-ex"
                          required
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          className="mt-1.5 rounded-xl bg-white text-xs font-mono font-medium text-center h-10 border-slate-200"
                        />
                      </div>

                      <div>
                        <Label htmlFor="gas-cv" className="text-xs font-bold text-slate-700">
                          CVC / Security Code
                        </Label>
                        <Input
                          id="gas-cv"
                          required
                          placeholder="123"
                          maxLength={4}
                          value={cardCvc}
                          onChange={handleCvcChange}
                          className="mt-1.5 rounded-xl bg-white text-xs font-mono font-medium text-center h-10 border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 font-medium border-t border-slate-200/50">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Card details are verified with 256-bit SSL encryption.</span>
                    </div>
                  </div>
                )}

                {/* PayPal Branded Section if PayPal Selected */}
                {paymentMethod === "PayPal" && (
                  <div className="p-5 sm:p-6 rounded-2xl bg-sky-50/40 border border-sky-200/80 space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                      <div className="flex items-center gap-2">
                        <PayPalIcon className="h-5 w-5" />
                        <span className="text-xs font-black text-slate-900 tracking-wide">
                          Pay with <span className="text-[#003087]">Pay</span>
                          <span className="text-[#0079C1]">Pal</span>
                        </span>
                      </div>
                      <span className="text-xs font-black text-[#003087]">{gbp(totalAmount)}</span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                      <p>
                        You will be directed to PayPal to complete your payment securely using your
                        PayPal balance, linked bank account, or saved credit/debit cards.
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-sky-800 font-medium">
                        <ShieldCheck className="h-4 w-4 text-[#0079C1] shrink-0" />
                        <span>Protected by PayPal Buyer Protection and 256-bit encryption.</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-white/80 border border-sky-100 p-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Total Payable Amount:</span>
                      <span className="text-sm font-black text-slate-900">{gbp(totalAmount)}</span>
                    </div>
                  </div>
                )}

                {/* COD Details if COD Selected */}
                {paymentMethod === "Pay on Delivery / Collection" && (
                  <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2 text-left">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                      <p className="font-extrabold flex items-center gap-1.5 text-amber-950">
                        <Banknote className="h-4 w-4 text-amber-700" /> Pay upon Delivery / Depot
                        Collection
                      </p>
                      <span className="font-black text-amber-950">{gbp(totalAmount)}</span>
                    </div>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      You will pay directly to our driver or at the Gloucestershire depot when your
                      cylinder is delivered or collected. No payment is charged right now.
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Account Notice if Unauthenticated */}
              {!user && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-left flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-blue-900">
                    <p className="font-extrabold">Customer Account Sign-In Required</p>
                    <p className="text-blue-700">
                      To ensure real-time tracking, warranty protection, and invoice persistence,
                      please sign in or register to complete this order.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submittingOrder || isProcessingPayment}
                  onClick={() => {
                    setStep(3);
                    scrollToStepSection(3);
                  }}
                  className="rounded-full px-6 py-2.5 h-11 font-bold text-slate-700"
                >
                  Back
                </Button>

                <Button
                  type="button"
                  disabled={submittingOrder || isProcessingPayment}
                  onClick={handlePlaceOrder}
                  className={cn(
                    "rounded-full px-8 py-3 text-white font-extrabold text-sm shadow-md flex items-center gap-2 cursor-pointer h-12 transition-all",
                    paymentMethod === "PayPal"
                      ? "bg-[#0079C1] hover:bg-[#00457C]"
                      : "bg-primary hover:bg-primary/90",
                  )}
                >
                  {isProcessingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {paymentMethod === "PayPal"
                          ? "Connecting to PayPal..."
                          : "Authorizing payment..."}
                      </span>
                    </>
                  ) : submittingOrder ? (
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
                      {paymentMethod === "PayPal" ? (
                        <>
                          <PayPalIcon className="h-4 w-4 fill-white" />
                          <span>Pay {gbp(totalAmount)} with PayPal</span>
                        </>
                      ) : paymentMethod === "Credit / Debit Card" ? (
                        <>
                          <span>Pay {gbp(totalAmount)} & Place Order</span>
                          <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                        </>
                      ) : (
                        <>
                          <span>Confirm & Place Order</span>
                          <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                        </>
                      )}
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
            <div id="order-gas-step-5" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 scroll-mt-24 sm:scroll-mt-28">
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
                  Your order for{" "}
                  <strong className="text-slate-900">
                    {completedOrder.quantity}x {completedOrder.product.name}
                  </strong>{" "}
                  has been secured in our system.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-left space-y-2.5 text-xs sm:text-sm">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Application:</span>
                  <span className="font-extrabold text-slate-900">
                    {completedOrder.usageType === "AUTOGAS" ? "Vehicle LPG / Autogas" : `${completedOrder.usageType} LPG`}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Order Type:</span>
                  <span className="font-bold text-slate-900">
                    {completedOrder.orderType.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Delivery Window:</span>
                  <span className="font-bold text-slate-900">
                    {completedOrder.deliveryDate} ({completedOrder.deliveryTimeSlot})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-bold text-slate-900">
                    {completedOrder.paymentMethod || "Credit / Debit Card"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Total Paid/Amount:</span>
                  <span className="font-black text-primary text-base">
                    {gbp(completedOrder.total)}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-500">Payment Status:</span>
                  <span
                    className={cn(
                      "font-extrabold",
                      completedOrder.paymentStatus === "Paid"
                        ? "text-emerald-700"
                        : "text-amber-700",
                    )}
                  >
                    {completedOrder.paymentStatus === "Paid"
                      ? "Paid in Full"
                      : "Pending (Due on Delivery)"}
                  </span>
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
              To comply with UK Gas Safety and Pressure Systems regulations, please complete and
              digitally sign your customer application once before placing your first gas order.
            </p>
          </DialogHeader>

          <div className="pt-2">
            <GasCustomerApplicationForm
              initialUsage={usageType || "DOMESTIC"}
              embedded
              onSuccess={(savedApp) => {
                setCustomerApp(savedApp);
                setShowApplicationModal(false);
                toast.success(
                  "Gas Customer Application verified and saved! Continuing with your order...",
                );
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

      {/* PRODUCT DETAIL INFORMATION MODAL (UNIVERSAL ACROSS ALL CATEGORIES) */}
      <ProductDetailsModal
        isOpen={!!detailProduct}
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        categorySlug={usageType === "AUTOGAS" ? "vehicle-lpg" : "calor-gas"}
        onSelectAndContinue={(prod, qty) => {
          setSelectedProductId(prod.id);
          setSelectedProductOverride(prod);
          setQuantity(qty || 1);
          setDetailProduct(null);
          const isCyl = isRefillableLpgCylinderProduct(prod) && usageType !== "AUTOGAS";
          const nextStep = !isCyl ? 3 : 2;
          if (!isCyl) {
            setOrderType("NEW_CYLINDER");
            setStep(3);
          } else {
            setConfirmedHasEmpty(true);
            setOrderType("REFILL_EXCHANGE");
            setStep(2); // Continue to Step 2 (New vs Refill)
          }
          toast.success(`Selected ${prod.name}`);
          scrollToStepSection(nextStep);
        }}
      />

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
