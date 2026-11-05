import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  Banknote,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Check,
  Flame,
  Mail,
  KeyRound,
  RefreshCw,
  Truck,
  Store,
  MapPin,
} from "lucide-react";
import { KNOWN_BRANCHES, resolveCheckoutBranchAssignment } from "@/lib/branch-service";
import {
  resolveCustomerGasPrice,
  calculateCylinderExchange,
  validateDeliveryPostcode,
  evaluateCustomerDeliveryFee,
  validateCustomerCreditAccount,
  getActiveCollectionForecourts,
  CLICK_AND_COLLECT_TIMELINE,
  REMINDER_CLICK_AND_COLLECT,
  REMINDER_DELIVERY,
  getOrderCylinderReminder,
  type CustomerPricingContext,
  parseGasTypeAndSize,
} from "@/lib/customer-order-pricing-service";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { gbp, useCartTotals, useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { isRefillableLpgCylinderProduct } from "@/lib/cylinder-exchange-service";
import {
  getCustomerGasApplication,
  isRestrictedGasProduct,
} from "@/lib/application-service";
import {
  sendCheckoutEmailOtp,
  verifyCheckoutEmailOtp,
  checkEmailVerifiedStatus,
} from "@/lib/checkout-email-service";
import { validateAndRedeemOfferServer, type Offer } from "@/lib/offer-service";
import {
  createElavonPaymentSessionServerFn,
  verifyElavonPaymentServerFn,
} from "@/lib/elavon-payment-server-fn";
import { triggerOrderPlacedPush } from "@/lib/push-notifications";

interface CheckoutSearch {
  payment?: "verify" | "cancelled" | "declined";
  orderId?: string;
  sessionId?: string;
  transactionId?: string;
}

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    payment: typeof search.payment === "string" ? (search.payment as any) : undefined,
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
    sessionId: typeof search.sessionId === "string" ? search.sessionId : undefined,
    transactionId: typeof search.transactionId === "string" ? search.transactionId : undefined,
  }),
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Checkout | John Stayte Services" },
      {
        name: "description",
        content: "Secure checkout for gas, fuel and appliance orders with account verification.",
      },
      { property: "og:title", content: "Checkout | John Stayte Services" },
      { property: "og:description", content: "Complete your John Stayte Services order." },
    ],
  }),
  component: Checkout,
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

function Checkout() {
  const search = Route.useSearch();
  const [appliedOffer] = useState<Offer | null>(() => {
    try {
      const saved = sessionStorage.getItem("jss.applied_offer");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const {
    lines,
    subtotal,
    offerDiscount,
    shipping,
    vat,
    total,
    settings,
    loading: cartLoading,
  } = useCartTotals(appliedOffer);
  const { clearCart, removeFromCart, user } = useStore();
  const [submitting, setSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [emailVerifyModalOpen, setEmailVerifyModalOpen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [refreshingAuth, setRefreshingAuth] = useState(false);
  const navigate = useNavigate();

  // Handle return redirect from Elavon Hosted Payment Gateway
  useEffect(() => {
    const { payment, orderId, sessionId } = search;
    if (payment === "verify" && orderId) {
      const verifiedOrderId = orderId;
      let isMounted = true;
      async function handleVerification() {
        setIsVerifyingPayment(true);
        try {
          const res = await verifyElavonPaymentServerFn({
            data: {
              orderId: verifiedOrderId,
              sessionId,
            },
          });

          if (res.ok && res.paymentStatus === "Paid") {
            clearCart();
            try {
              sessionStorage.removeItem("jss.applied_offer");
            } catch {
              /* ignore */
            }
            toast.success("Payment verified! Your order has been placed successfully.", {
              id: "elavon-payment-success",
            });
            navigate({ to: `/account/orders/${verifiedOrderId}` as any });
          } else {
            toast.error(
              res.message ||
                "Card payment verification could not be completed. Please contact support or retry.",
              { id: "elavon-payment-error" },
            );
            navigate({ to: "/checkout", search: {} });
          }
        } catch (err: any) {
          toast.error("Payment verification failed: " + (err.message || "Network error"));
          navigate({ to: "/checkout", search: {} });
        } finally {
          if (isMounted) setIsVerifyingPayment(false);
        }
      }
      handleVerification();
      return () => {
        isMounted = false;
      };
    } else if (payment === "cancelled") {
      let isMounted = true;
      if (orderId) {
        const cancelledOrderId = orderId;
        // Authoritative reconciliation: Verify whether transaction was captured before cancelling
        verifyElavonPaymentServerFn({
          data: {
            orderId: cancelledOrderId,
            sessionId,
          },
        })
          .then((res) => {
            if (!isMounted) return;
            if (res.ok && res.paymentStatus === "Paid") {
              clearCart();
              try {
                sessionStorage.removeItem("jss.applied_offer");
              } catch {
                /* ignore */
              }
              toast.success("Payment verified! Your order has been placed successfully.", {
                id: "elavon-payment-success",
              });
              navigate({ to: `/account/orders/${cancelledOrderId}` as any });
            } else {
              toast.info(
                "Card payment session was cancelled. Your basket items are saved so you can try again.",
              );
              navigate({ to: "/checkout", search: {} });
            }
          })
          .catch(() => {
            if (!isMounted) return;
            toast.info(
              "Card payment session was cancelled. Your basket items are saved so you can try again.",
            );
            navigate({ to: "/checkout", search: {} });
          });
      } else {
        toast.info(
          "Card payment session was cancelled. Your basket items are saved so you can try again.",
        );
        navigate({ to: "/checkout", search: {} });
      }
      return () => {
        isMounted = false;
      };
    }
  }, [search.payment, search.orderId, search.sessionId, clearCart, navigate]);

  // Redirect unauthenticated visitors to login with return path to /checkout
  useEffect(() => {
    if (!user) {
      toast.info("Please sign in or create an account to proceed with checkout.", {
        id: "checkout-auth-required",
        duration: 4000,
      });
      navigate({ to: "/login", search: { redirect: "/checkout" } });
    }
  }, [user, navigate]);

  // Delivery & Fulfilment Form Fields
  const [fulfilmentMethod, setFulfilmentMethod] = useState<"delivery" | "collection">("delivery");
  const [selectedBranch, setSelectedBranch] = useState<string>("John Stayte Services – Cirencester");
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<"IDLE" | "OTP_SENT" | "VERIFIED">(
    "IDLE",
  );
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [address, setAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  // Computed verified boolean
  const isEmailVerified = useMemo(() => {
    if (!email.trim()) return false;
    return Boolean(verifiedEmail && verifiedEmail.toLowerCase() === email.trim().toLowerCase());
  }, [verifiedEmail, email]);

  // Check initial verification status on mount / user change
  useEffect(() => {
    let isMounted = true;
    async function checkInitial() {
      const targetEmail = (user?.email || email).trim();
      if (!targetEmail) return;
      const isVerified = await checkEmailVerifiedStatus(targetEmail);
      if (isMounted && isVerified) {
        setVerifiedEmail(targetEmail.toLowerCase());
        setVerificationStep("VERIFIED");
      }
    }
    checkInitial();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleEmailChange = (newVal: string) => {
    setEmail(newVal);
    if (verifiedEmail && newVal.trim().toLowerCase() !== verifiedEmail.toLowerCase()) {
      setVerifiedEmail(null);
      setVerificationStep("IDLE");
      setOtpCode("");
    }
  };

  const handleSendEmailOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return toast.error("Please enter a valid email address to receive your verification code.");
    }
    setSendingOtp(true);
    try {
      const res = await sendCheckoutEmailOtp(cleanEmail);
      toast.success(res.message);
      setVerificationStep("OTP_SENT");
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      return toast.error("Please enter the complete 6-digit code received in your email.");
    }
    setVerifyingOtp(true);
    try {
      const res = await verifyCheckoutEmailOtp(email, cleanOtp);
      if (res.ok) {
        setVerifiedEmail(res.verifiedEmail);
        setVerificationStep("VERIFIED");
        setOtpCode("");
        setEmailVerifyModalOpen(false);
        toast.success("Email verified successfully! You can now place your order.");
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleChangeEmailClick = () => {
    setVerifiedEmail(null);
    setVerificationStep("IDLE");
    setOtpCode("");
  };

  const handleResendVerification = async () => {
    await handleSendEmailOtp();
  };

  const handleRefreshVerification = async () => {
    setRefreshingAuth(true);
    try {
      const targetEmail = (user?.email || email).trim();
      const isVerified = await checkEmailVerifiedStatus(targetEmail);
      if (isVerified) {
        setVerifiedEmail(targetEmail.toLowerCase());
        setVerificationStep("VERIFIED");
        setEmailVerifyModalOpen(false);
        toast.success("Email verified successfully! You can now complete your order.");
      } else {
        toast.error("Email is not yet confirmed. Please verify the code sent to your email.");
      }
    } catch (err: any) {
      toast.error("Verification status check failed: " + err.message);
    } finally {
      setRefreshingAuth(false);
    }
  };

  // Customer Pricing Context (Phase 1-4 Band Resolution & Special Customer Accounts)
  const [customerPricing, setCustomerPricing] = useState<CustomerPricingContext>({
    userId: user?.id,
    userRole: user?.role,
    pricingBand: null,
    pricingBandId: null,
    customerCode: null,
    accountApproved: false,
    creditAccountApproved: false,
    creditLimit: 0,
  });

  useEffect(() => {
    async function loadCustomerPricing() {
      if (!user?.id) return;
      try {
        const { data: prof } = await (supabase.from("profiles") as any)
          .select("id, role, pricing_band, pricing_band_id, customer_code, account_approved, credit_account_approved, credit_limit, notification_prefs")
          .eq("id", user.id)
          .maybeSingle();

        const gasApp = (prof?.notification_prefs as any)?.gas_application;

        setCustomerPricing({
          userId: user.id,
          userRole: user.role,
          pricingBand: prof?.pricing_band || gasApp?.pricing_band || null,
          pricingBandId: prof?.pricing_band_id || gasApp?.pricing_band_id || null,
          customerCode: prof?.customer_code || gasApp?.customer_code || null,
          accountApproved: Boolean(prof?.account_approved || gasApp?.status === "APPROVED"),
          creditAccountApproved: Boolean(prof?.credit_account_approved || gasApp?.credit_account_approved),
          creditLimit: Number(prof?.credit_limit ?? gasApp?.credit_limit ?? 0),
        });
      } catch (err) {
        console.warn("Could not load customer pricing profile:", err);
      }
    }
    loadCustomerPricing();
  }, [user]);

  // Gas Cylinder Exchange Option
  const [cylinderExchangeType, setCylinderExchangeType] = useState<"refill" | "new">("refill");
  const [returnedCylinderType, setReturnedCylinderType] = useState<string>("Calor Propane Cylinder");
  const [returnedEmptyCount, setReturnedEmptyCount] = useState<number>(1);

  // Check if cart contains actual refillable/exchangeable gas cylinders
  const hasCylinderInCart = useMemo(() => {
    return lines.some((l) => isRefillableLpgCylinderProduct(l.product));
  }, [lines]);

  const totalCylinderQty = useMemo(() => {
    return lines
      .filter((l) => isRefillableLpgCylinderProduct(l.product))
      .reduce((sum, l) => sum + l.qty, 0);
  }, [lines]);

  // Keep returnedEmptyCount bounded by totalCylinderQty
  useEffect(() => {
    if (totalCylinderQty > 0) {
      setReturnedEmptyCount((prev) => Math.min(Math.max(1, prev), totalCylinderQty));
    }
  }, [totalCylinderQty]);

  // Payment Form Fields (Elavon Hosted Payments, Cash, or Credit Account)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "cod" | "credit_account">("card");
  const [cardholderName, setCardholderName] = useState(user?.name || "");
  const [creditFacilityStatus, setCreditFacilityStatus] = useState<{
    checked: boolean;
    approved: boolean;
    availableCredit: number;
    creditLimit: number;
    withinTerms: boolean;
    error?: string;
  } | null>(null);

  // Check credit facility whenever credit account is selected or total updates
  useEffect(() => {
    if (paymentMethod === "credit_account" && user?.id) {
      validateCustomerCreditAccount(user.id, total).then((res) => {
        setCreditFacilityStatus({
          checked: true,
          approved: res.approved,
          availableCredit: res.availableCredit,
          creditLimit: res.creditLimit,
          withinTerms: res.withinTerms,
          error: res.error,
        });
      });
    }
  }, [paymentMethod, user?.id, total]);

  // Automatically load and prefill customer's saved default address from Supabase
  useEffect(() => {
    async function loadCustomerAddresses() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (!authUser?.user) return;

        const { data: addrs } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("user_id", authUser.user.id)
          .order("is_default", { ascending: false });

        if (addrs && addrs.length > 0) {
          setSavedAddresses(addrs);
          const defaultAddr = addrs.find((a: any) => a.is_default) || addrs[0];
          if (defaultAddr) {
            setAddress(defaultAddr.street || "");
            setPostcode(defaultAddr.postcode || "");
            if (defaultAddr.name && (!user?.name || user.name === "Customer")) {
              setFullName(defaultAddr.name);
              if (!cardholderName) setCardholderName(defaultAddr.name);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load saved customer addresses:", err);
      }
    }
    loadCustomerAddresses();
  }, [user]);

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) return toast.error("Your basket is empty.");

    // 1. Enforce active authenticated customer account
    const { data: authSession } = await supabase.auth.getSession();
    const activeAuthUser = authSession?.session?.user || user;

    if (!activeAuthUser?.id) {
      toast.error("Please sign in or create an account to complete checkout.", {
        description: "Your basket items will remain saved in your basket.",
      });
      navigate({ to: "/login", search: { redirect: "/checkout" } });
      return;
    }

    // 2. Gas Customer Account & Approval Verification for Restricted LPG Products
    const containsRestrictedGas = lines.some((l) => isRestrictedGasProduct(l.product));
    if (containsRestrictedGas) {
      const app = await getCustomerGasApplication(activeAuthUser.id);
      let isProfileApproved = false;
      try {
        const { data: prof } = await (supabase.from("profiles") as any)
          .select("account_approved, application_status")
          .eq("id", activeAuthUser.id)
          .maybeSingle();
        isProfileApproved = Boolean(prof?.account_approved);
      } catch (e) {
        // Non-critical profile query error
      }

      const isApproved = isProfileApproved || app?.status === "APPROVED";

      if (!isApproved) {
        if (!app || app.status === "NOT_COMPLETED") {
          toast.error("Gas Customer Application Required", {
            description:
              "Purchasing bottled gas or LPG products requires a completed and approved customer gas application.",
            action: {
              label: "Complete Application",
              onClick: () => navigate({ to: "/account/application" }),
            },
          });
        } else if (app.status === "MORE_INFO_NEEDED") {
          toast.warning("Additional Information Needed", {
            description:
              "Depot manager requested additional details on your gas application before orders can be placed.",
            action: {
              label: "Provide Details",
              onClick: () => navigate({ to: "/account/application" }),
            },
          });
        } else if (app.status === "DECLINED" || app.status === "REJECTED") {
          toast.error("Gas Customer Application Declined", {
            description:
              "Your gas customer application was not approved. Please review your application details.",
            action: {
              label: "View Application",
              onClick: () => navigate({ to: "/account/application" }),
            },
          });
        } else {
          toast.info("Gas Application Pending Approval", {
            description:
              "Your gas customer application is currently awaiting manager review. LPG orders will be unlocked upon approval.",
            action: {
              label: "Check Status",
              onClick: () => navigate({ to: "/account/application" }),
            },
          });
        }
        navigate({ to: "/account/application" });
        return;
      }
    }

    // 3. Strict Real Email Verification Security Enforcement
    const cleanEmail = email.trim().toLowerCase();
    if (!isEmailVerified || verifiedEmail?.toLowerCase() !== cleanEmail) {
      if (verificationStep !== "OTP_SENT") {
        await handleSendEmailOtp();
      }
      return toast.error(
        "Email verification required: Please enter and verify the 6-digit code sent to your email before placing your order.",
      );
    }

    // Backend database verification check
    const isBackendVerified = await checkEmailVerifiedStatus(cleanEmail);
    if (!isBackendVerified) {
      setVerifiedEmail(null);
      setVerificationStep("IDLE");
      return toast.error(
        "Email verification could not be confirmed on the database server. Please verify your email code again.",
      );
    }

    if (subtotal <= 0) {
      return toast.error("Order total must be greater than £0.00 to place an order.");
    }

    if (!fullName || !email || !address || !postcode) {
      return toast.error("Please fill in all required delivery details.");
    }

    setSubmitting(true);
    let createdOrderId: string | null = null;

    try {
      const currentUserId = activeAuthUser.id;
      const currentEmail = activeAuthUser.email || email.trim();

      // 4. Strict Live Database Verification for every cart product & stock level
      const verifiedItems: {
        product_id: string | null;
        product_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
      }[] = [];

      for (const line of lines) {
        const { data: dbProduct, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, stock, slug")
          .eq("slug", line.slug)
          .single();

        if (prodErr || !dbProduct) {
          removeFromCart(line.slug);
          throw new Error(
            `Product '${line.product.name}' is no longer available in the catalog and has been removed from your basket.`,
          );
        }

        const currentStock = Number(dbProduct.stock || 0);
        if (currentStock < line.qty) {
          throw new Error(
            currentStock === 0
              ? `'${dbProduct.name}' is currently out of stock. Please update your basket.`
              : `Requested quantity for '${dbProduct.name}' exceeds available stock. Please reduce quantity in basket.`,
          );
        }

        const unitPrice = Number(dbProduct.price);
        verifiedItems.push({
          product_id: dbProduct.id,
          product_name: dbProduct.name,
          quantity: line.qty,
          unit_price: unitPrice,
          total_price: unitPrice * line.qty,
        });
      }

      const finalSubtotal = verifiedItems.reduce((s, i) => s + i.total_price, 0);
      if (finalSubtotal <= 0) {
        throw new Error("Order total must be greater than £0.00 to place an order.");
      }
      const finalTotal = Math.max(0, finalSubtotal + shipping + vat);
      const orderNumber = `JSS-${Date.now().toString().slice(-6)}`;

      const isCollection = fulfilmentMethod === "collection";
      const branchAssignment = resolveCheckoutBranchAssignment(fulfilmentMethod, selectedBranch);

      // Validate delivery coverage if delivery selected
      if (!isCollection) {
        const coverage = validateDeliveryPostcode(postcode);
        if (!coverage.valid) {
          throw new Error(coverage.message || "Entered postcode is outside our standard delivery fleet coverage.");
        }
      }

      // Validate credit facility if Credit Account selected
      if (paymentMethod === "credit_account") {
        const creditVal = await validateCustomerCreditAccount(currentUserId, finalTotal);
        if (!creditVal.withinTerms) {
          throw new Error(creditVal.error || "Order total exceeds available commercial credit facility limit.");
        }
      }

      type OrderPaymentStatus = "Pending" | "Paid" | "Failed" | "Cancelled";
      const getInitialPaymentStatus = (): OrderPaymentStatus => "Pending";
      const finalPaymentStatus: OrderPaymentStatus = getInitialPaymentStatus();
      const finalPaymentMethod =
        paymentMethod === "credit_account"
          ? "Credit Account (30-Day Invoice)"
          : paymentMethod === "paypal"
            ? "PayPal"
            : paymentMethod === "card"
              ? "Credit / Debit Card (Elavon)"
              : isCollection
                ? "Pay upon Collection"
                : "Pay on Delivery";

      const isEmptyRequired = hasCylinderInCart ? cylinderExchangeType === "refill" : false;
      const orderTypeTag = hasCylinderInCart
        ? cylinderExchangeType === "refill"
          ? "REFILL_EXCHANGE"
          : "NEW_CYLINDER"
        : "STANDARD";

      const cylinderReminder = getOrderCylinderReminder(fulfilmentMethod, hasCylinderInCart && isEmptyRequired);

      // 5. Create Initial Order Record in Supabase (with provisional values)
      const provisionalTotal = Math.max(
        0,
        settings.taxPricingMode === "inclusive"
          ? finalSubtotal + (isCollection ? 0 : shipping)
          : finalSubtotal + (isCollection ? 0 : shipping) + vat,
      );
      const { data: newOrder, error: orderErr } = await (supabase.from("orders") as any)
        .insert([
          {
            order_number: orderNumber,
            customer_id: currentUserId,
            customer_name: fullName.trim(),
            customer_email: currentEmail,
            customer_phone: phone.trim(),
            delivery_address: {
              name: fullName.trim(),
              street: isCollection ? `[Click & Collect: ${selectedBranch}]` : address.trim(),
              postcode: isCollection ? "" : postcode.trim(),
              phone: phone.trim(),
              payment_method: finalPaymentMethod,
              empty_cylinder_required: isEmptyRequired,
              order_type: orderTypeTag,
              fulfilment_method: fulfilmentMethod,
              collection_branch: branchAssignment.collectionBranch,
              collection_branch_id: branchAssignment.collectionBranchId,
            },
            assigned_branch_id: branchAssignment.assignedBranchId,
            subtotal: finalSubtotal,
            shipping_fee: isCollection ? 0 : shipping,
            total: provisionalTotal,
            status: "Pending",
            fulfillment_status: "Pending",
            assigned_depot: branchAssignment.assignedDepot,
            payment_status: finalPaymentStatus,
            notes: [
              `[Payment: ${finalPaymentMethod}]`,
              isCollection ? `[Click & Collect: ${selectedBranch}]` : "[Standard Delivery]",
              hasCylinderInCart
                ? `[Empty Cylinder Required: ${isEmptyRequired ? "Yes" : "No"}]`
                : "",
              hasCylinderInCart ? `[${orderTypeTag}]` : "",
            ]
              .filter(Boolean)
              .join(" | "),
          },
        ])
        .select()
        .single();

      if (orderErr || !newOrder) {
        throw new Error(orderErr?.message || "Failed to process your order. Please try again.");
      }

      createdOrderId = newOrder.id;

      // 6. Authoritative Atomic Server Offer Validation & Concurrency Lock
      let verifiedDiscount = 0;
      let verifiedOfferId: string | null = null;
      let verifiedOfferCode: string | null = null;

      if (appliedOffer) {
        try {
          const valRes = await validateAndRedeemOfferServer({
            offerId: appliedOffer.id || null,
            code: appliedOffer.code || null,
            userId: currentUserId || null,
            email: currentEmail,
            cartItems: verifiedItems,
            subtotal: finalSubtotal,
            // Only execute database redemption lock for offline/COD orders.
            // For card payments, pass null so offer rules/discounts are validated
            // without consuming the customer's redemption until payment is captured.
            orderId: paymentMethod === "card" ? null : newOrder.id,
          });

          if (valRes.isValid && valRes.discountAmount > 0) {
            verifiedDiscount = valRes.discountAmount;
            verifiedOfferId = valRes.offerId || appliedOffer.id;
            verifiedOfferCode = valRes.offerCode || appliedOffer.code || null;
          } else if (!valRes.isValid) {
            // Non-blocking fallback: Order continues safely with standard £0.00 discount
            toast.info(
              valRes.message ||
                "This offer is no longer available. Your order will continue without the discount.",
            );
            verifiedDiscount = 0;
            verifiedOfferId = null;
            verifiedOfferCode = null;
          }
        } catch (valErr) {
          console.warn("Offer validation server notice:", valErr);
          toast.info(
            "This offer could not be applied. Your order will continue without the discount.",
          );
          verifiedDiscount = 0;
          verifiedOfferId = null;
          verifiedOfferCode = null;
        }
      }

      // Recompute authoritative final total using active system settings
      const taxableSubtotal = Math.max(0, finalSubtotal - verifiedDiscount);

      let authoritativeShipping = 0;
      if (settings.freeDeliveryEnabled) {
        if (settings.freeDeliveryThreshold === 0 || finalSubtotal >= settings.freeDeliveryThreshold) {
          authoritativeShipping = 0;
        } else {
          authoritativeShipping = settings.deliveryChargesEnabled ? settings.defaultShippingFee : 0;
        }
      } else {
        authoritativeShipping = settings.deliveryChargesEnabled ? settings.defaultShippingFee : 0;
      }

      let authoritativeVat = 0;
      if (settings.taxEnabled && settings.vatRate > 0) {
        if (settings.taxPricingMode === "inclusive") {
          authoritativeVat = taxableSubtotal - taxableSubtotal / (1 + settings.vatRate / 100);
        } else {
          authoritativeVat = taxableSubtotal * (settings.vatRate / 100);
        }
      }

      const finalAuthoritativeTotal = Math.max(
        0,
        settings.taxPricingMode === "inclusive"
          ? taxableSubtotal + authoritativeShipping
          : taxableSubtotal + authoritativeShipping + authoritativeVat,
      );

      // Update order record with authoritative total, shipping, and offer linkage
      await (supabase.from("orders") as any)
        .update({
          shipping_fee: authoritativeShipping,
          total: finalAuthoritativeTotal,
          offer_id: verifiedOfferId,
          offer_code: verifiedOfferCode,
          notes: [
            `[Payment: ${finalPaymentMethod}]`,
            isCollection ? `[Click & Collect: ${selectedBranch}]` : "[Standard Delivery]",
            verifiedDiscount > 0 ? `[Offer Applied: -${gbp(verifiedDiscount)}]` : "",
            hasCylinderInCart ? `[Empty Cylinder Required: ${isEmptyRequired ? "Yes" : "No"}]` : "",
            hasCylinderInCart && isEmptyRequired ? `[Returned: ${returnedCylinderType} x ${returnedEmptyCount}]` : "",
            hasCylinderInCart ? `[${orderTypeTag}]` : "",
            cylinderReminder ? `[Reminder: ${cylinderReminder}]` : "",
          ]
            .filter(Boolean)
            .join(" | "),
        })
        .eq("id", newOrder.id);

      // Also create initial delivery assignment awaiting Admin/Manager assignment
      try {
        await (supabase.from("delivery_assignments") as any).insert([
          {
            order_id: newOrder.id,
            order_ref: orderNumber,
            customer_name: fullName.trim(),
            address: `${address.trim()}, ${postcode.trim()}`,
            area: "Gloucestershire",
            driver_name: "Unassigned",
            agent_id: null,
            driver_id: null,
            vehicle_plate: null,
            time_slot: "Morning (08:00 - 12:00)",
            status: "Pending",
            notes: `[Standard Checkout] | Empty Cylinder Required: ${isEmptyRequired ? "Yes" : "No"}${isEmptyRequired ? " | Expected: 1" : ""}`,
          },
        ]);
      } catch (delErr) {
        console.warn("Delivery assignment creation notice:", delErr);
      }

      // 7. Create Order Items Records (with strict transaction rollback on failure)
      const itemInserts = verifiedItems.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemInserts);
      if (itemsErr) {
        // Roll back parent order record to avoid orphan orders (and trigger auto usage rollback)
        await supabase.from("orders").delete().eq("id", newOrder.id);
        throw new Error(`Failed to save items for order: ${itemsErr.message}`);
      }

      // 8. Create Order Status History Record
      await supabase.from("order_status_history").insert([
        {
          order_id: newOrder.id,
          status: "Pending",
          actor_id: currentUserId,
          actor_name: fullName.trim(),
          notes: `Order placed via online checkout (${finalPaymentMethod} • ${finalPaymentStatus}${verifiedDiscount > 0 ? ` • Discount: -${gbp(verifiedDiscount)}` : ""}).`,
        },
      ]);

      // 9. Update Database Inventory for Ordered Products
      // IMPORTANT: For Card payments, inventory is decremented strictly upon authoritative
      // payment capture in verifyElavonPaymentServerFn. This prevents abandoned/cancelled
      // checkouts from consuming stock. For COD, decrement stock immediately.
      if (paymentMethod !== "card") {
        for (const item of verifiedItems) {
          if (item.product_id) {
            try {
              const { data: currentInv } = await supabase
                .from("inventory")
                .select("current_stock")
                .eq("product_id", item.product_id)
                .single();

              if (currentInv) {
                const newStock = Math.max(0, currentInv.current_stock - item.quantity);
                await supabase
                  .from("inventory")
                  .update({ current_stock: newStock, updated_at: new Date().toISOString() })
                  .eq("product_id", item.product_id);
              }

              const { data: currentProd } = await supabase
                .from("products")
                .select("stock")
                .eq("id", item.product_id)
                .single();

              if (currentProd) {
                const newStock = Math.max(0, currentProd.stock - item.quantity);
                await supabase
                  .from("products")
                  .update({ stock: newStock, updated_at: new Date().toISOString() })
                  .eq("id", item.product_id);
              }
            } catch (invErr) {
              console.warn("Inventory update notice:", invErr);
            }
          }
        }
      }

      // 10. Create Invoice Record in Supabase
      try {
        await (supabase.from("invoices") as any).insert([
          {
            invoice_number: `INV-${orderNumber.replace("JSS-", "")}`,
            order_id: newOrder.id,
            customer_id: currentUserId,
            customer_name: fullName.trim(),
            customer_email: currentEmail,
            subtotal: finalSubtotal,
            total_amount: finalAuthoritativeTotal,
            status: finalPaymentStatus === "Paid" ? "Paid" : "Issued",
          },
        ]);
      } catch (invErr) {
        console.warn("Invoice record notice:", invErr);
      }

      // 11. Clear Session Applied Offer (for COD; card payments clear after payment verification)
      if (paymentMethod !== "card") {
        try {
          sessionStorage.removeItem("jss.applied_offer");
        } catch {
          /* ignore */
        }
      }

      // 10. Create Customer Notification in Supabase customer_notifications
      try {
        await supabase.from("customer_notifications").insert([
          {
            user_id: currentUserId,
            title: `Order #${orderNumber} Confirmed`,
            message: `Your order for ${verifiedItems.length} item(s) totalling ${gbp(finalTotal)} has been received.${cylinderReminder ? ` ${cylinderReminder}` : ""}`,
            category: "Orders",
            is_read: false,
          },
        ]);
      } catch (notifErr) {
        console.error("Customer notification creation error:", notifErr);
      }

      // 11. Create Real Persistent Manager Notification in public.notifications
      try {
        const { data: existingStaffNotifs } = await supabase
          .from("notifications")
          .select("id")
          .eq("title", `New Order #${orderNumber}`)
          .limit(1);

        if (!existingStaffNotifs || existingStaffNotifs.length === 0) {
          const { error: staffNotifErr } = await (supabase.from("notifications") as any).insert([
            {
              user_id: null, // Broadcast to all operations managers and admins
              title: `New Order #${orderNumber}`,
              message: `${fullName.trim()} placed a new order #${orderNumber} (${verifiedItems.length} item(s), total ${gbp(finalTotal)} • ${finalPaymentMethod}).`,
              category: "Orders",
              link: `/manager/orders?orderId=${newOrder.id}`,
              read: false,
              is_read: false,
            },
          ]);
          if (staffNotifErr) {
            console.error("Failed to insert manager order notification:", staffNotifErr);
          }
        }
      } catch (staffErr) {
        console.error("Manager notification creation notice:", staffErr);
      }

      // 11b. Native Push Notifications for Customer & Staff
      try {
        triggerOrderPlacedPush({
          orderId: newOrder.id,
          orderNumber: String(orderNumber),
          customerId: currentUserId,
          itemCount: verifiedItems.length,
          totalFormatted: gbp(finalTotal),
          customerName: fullName.trim(),
        }).catch((err) => console.warn("[Checkout] Order placed push notice:", err));
      } catch (pushErr) {
        console.warn("[Checkout] Native push trigger notice:", pushErr);
      }

      // 12. If Card payment: Initiate secure Elavon payment session and redirect customer
      if (paymentMethod === "card") {
        setIsProcessingPayment(true);
        const sessionRes = await createElavonPaymentSessionServerFn({
          data: {
            orderId: newOrder.id,
            orderNumber,
            amount: finalAuthoritativeTotal,
            currency: "GBP",
            customerEmail: currentEmail,
            customerName: fullName.trim(),
            returnUrl: `${window.location.origin}/checkout`,
            cancelUrl: `${window.location.origin}/checkout`,
          },
        });

        if (!sessionRes.ok || !sessionRes.paymentUrl) {
          throw new Error(
            sessionRes.error || "Failed to initialize secure card payment session with Elavon.",
          );
        }

        // Customer completes 3DS2 / SCA on Elavon hosted payment page
        window.location.href = sessionRes.paymentUrl;
        return;
      }

      // 13. Pay on Delivery / Offline path: Clear Cart & Complete
      clearCart();
      toast.success(`Order #${orderNumber} placed successfully!`, {
        description: cylinderReminder || undefined,
        duration: 8000,
      });
      navigate({ to: `/account/orders/${newOrder.id}` as any });
    } catch (err: any) {
      // If parent order was created but downstream failed, attempt safe cleanup
      if (createdOrderId) {
        try {
          await supabase.from("order_items").delete().eq("order_id", createdOrderId);
          await supabase.from("orders").delete().eq("id", createdOrderId);
        } catch (rollbackErr) {
          console.warn("Order rollback notice:", rollbackErr);
        }
      }
      toast.error("Order placement failed: " + err.message);
    } finally {
      setSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Checkout"
        title={user ? `Checkout, ${user.name.split(" ")[0]}` : "Guest checkout"}
      />
      <form
        onSubmit={place}
        className="container-page grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_380px]"
      >
        <div className="space-y-6 text-left">
          {/* Section 1: Delivery / Collection Details */}
          <section className="surface-card p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 font-display">
                {fulfilmentMethod === "collection" ? "Click & Collect Details" : "Delivery Details"}
              </h2>
              {savedAddresses.length > 0 && fulfilmentMethod === "delivery" && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Using saved address
                </span>
              )}
            </div>

            {/* Fulfilment Method Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
              <button
                type="button"
                onClick={() => setFulfilmentMethod("delivery")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 select-none",
                  fulfilmentMethod === "delivery"
                    ? "border-red-600 bg-red-50/30 ring-2 ring-red-600/20 shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                    fulfilmentMethod === "delivery" ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">Home / Business Delivery</span>
                  <span className="text-[11px] text-slate-500">Delivered directly to your Gloucestershire address</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFulfilmentMethod("collection")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 select-none",
                  fulfilmentMethod === "collection"
                    ? "border-amber-600 bg-amber-50/30 ring-2 ring-amber-600/20 shadow-xs"
                    : "border-slate-200 bg-white hover:bg-slate-50",
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                    fulfilmentMethod === "collection" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Store className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs text-slate-900 block">Click &amp; Collect</span>
                  <span className="text-[11px] text-slate-500">Collect at your chosen JSS station forecourt</span>
                </div>
              </button>
            </div>

            {/* Click & Collect Station Selector */}
            {fulfilmentMethod === "collection" && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      Select Collection Forecourt Branch:
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                    {CLICK_AND_COLLECT_TIMELINE}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {getActiveCollectionForecourts().map((b) => {
                    const isSelected = selectedBranch === b.name;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBranch(b.name)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 text-xs cursor-pointer",
                          isSelected
                            ? "border-amber-600 bg-white font-bold ring-2 ring-amber-500/20 text-slate-900 shadow-2xs"
                            : "border-amber-200/60 bg-white/70 text-slate-700 hover:bg-white",
                        )}
                      >
                        <div>
                          <p className="font-black text-xs text-slate-900">{b.name}</p>
                          <p className="text-[11px] text-slate-500">{b.address}, {b.town} {b.postcode}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 block font-medium">{b.telephone}</span>
                          <span className="text-[10px] text-emerald-700 font-bold block">In Stock • 2h Pickup</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {savedAddresses.length > 1 && fulfilmentMethod === "delivery" && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                  Select Delivery Address:
                </span>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setAddress(addr.street || "");
                        setPostcode(addr.postcode || "");
                        if (addr.name) {
                          setFullName(addr.name);
                          setCardholderName(addr.name);
                        }
                        toast.info(`Selected address: ${addr.label || addr.street}`);
                      }}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                        address === addr.street
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {addr.label || "Address"}: {addr.street.slice(0, 24)}...
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="fn" className="text-xs font-bold text-slate-700">
                  Full name
                </Label>
                <Input
                  id="fn"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (!cardholderName) setCardholderName(e.target.value);
                  }}
                  className="mt-1.5 rounded-full text-xs font-medium"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="em" className="text-xs font-bold text-slate-700">
                    Email address
                  </Label>
                  {isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified Email
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-600">
                      OTP Verification Required
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="em"
                    type="email"
                    required
                    maxLength={120}
                    value={email}
                    disabled={isEmailVerified && verificationStep === "VERIFIED"}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    className={cn(
                      "rounded-full text-xs font-medium flex-1",
                      isEmailVerified &&
                        "bg-emerald-50/50 border-emerald-300 font-semibold text-emerald-900",
                    )}
                    placeholder="customer@example.com"
                  />
                  {isEmailVerified ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleChangeEmailClick}
                      className="rounded-full text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0 h-9 px-3"
                    >
                      Change
                    </Button>
                  ) : verificationStep === "IDLE" ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSendEmailOtp}
                      disabled={sendingOtp || !email.trim() || !email.includes("@")}
                      className="rounded-full text-xs font-bold bg-primary hover:bg-primary/90 text-white shrink-0 h-9 px-4"
                    >
                      {sendingOtp ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Send Code
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>

                {/* 6-Digit Verification Code Entry */}
                {verificationStep === "OTP_SENT" && !isEmailVerified && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-2.5 mt-2 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-amber-600" /> Enter 6-digit code sent
                        to inbox:
                      </span>
                      <span className="text-[11px] font-mono font-bold text-amber-700">
                        {cooldown > 0 ? `Resend in ${cooldown}s` : ""}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="rounded-xl text-center text-base tracking-[0.3em] font-mono font-black bg-white border-amber-300 h-9 flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleVerifyEmailOtp}
                        disabled={verifyingOtp || otpCode.trim().length !== 6}
                        className="rounded-xl text-xs font-bold bg-amber-700 hover:bg-amber-800 text-white shrink-0 h-9 px-3"
                      >
                        {verifyingOtp ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Verifying...
                          </>
                        ) : (
                          "Verify Code"
                        )}
                      </Button>
                      {cooldown === 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSendEmailOtp}
                          disabled={sendingOtp}
                          className="rounded-xl text-xs font-bold border-amber-300 text-amber-900 bg-white hover:bg-amber-100 shrink-0 h-9 px-3"
                        >
                          Resend
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-800 leading-tight">
                      Please check your spam/junk folder if the code doesn't arrive in your main
                      inbox.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="ph" className="text-xs font-bold text-slate-700">
                  Telephone
                </Label>
                <Input
                  id="ph"
                  type="tel"
                  required
                  maxLength={20}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01452 123456"
                  className="mt-1.5 rounded-full text-xs font-medium"
                />
              </div>
              {fulfilmentMethod === "delivery" && (
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pc" className="text-xs font-bold text-slate-700">
                      Postcode
                    </Label>
                    {postcode.trim() && (
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          validateDeliveryPostcode(postcode).valid
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800",
                        )}
                      >
                        {validateDeliveryPostcode(postcode).valid ? "✓ Delivery Covered" : "Outside Standard Area"}
                      </span>
                    )}
                  </div>
                  <Input
                    id="pc"
                    required={fulfilmentMethod === "delivery"}
                    maxLength={10}
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                    placeholder="GL2 7LZ"
                    className="mt-1.5 rounded-full text-xs font-medium"
                  />
                  {postcode.trim() && (
                    <p
                      className={cn(
                        "text-[11px] mt-1 font-medium",
                        validateDeliveryPostcode(postcode).valid ? "text-emerald-700" : "text-amber-700",
                      )}
                    >
                      {validateDeliveryPostcode(postcode).message}
                      {validateDeliveryPostcode(postcode).valid && ` • ${validateDeliveryPostcode(postcode).estimatedTimeline}`}
                    </p>
                  )}
                </div>
              )}
            </div>
            {fulfilmentMethod === "delivery" && (
              <div>
                <Label htmlFor="ad" className="text-xs font-bold text-slate-700">
                  Delivery Address &amp; Instructions
                </Label>
                <Textarea
                  id="ad"
                  required={fulfilmentMethod === "delivery"}
                  maxLength={300}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, town, and any delivery access instructions..."
                  className="mt-1.5 rounded-2xl text-xs font-medium"
                />
              </div>
            )}
          </section>

          {/* Section 1.5: Gas Cylinder Exchange Option (Flowchart Step 3) */}
          {hasCylinderInCart && (
            <section className="surface-card p-6 sm:p-7 space-y-4 bg-amber-50/40 border border-amber-200/90 rounded-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-red-600" />
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Empty Cylinder Exchange Check
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Total Cylinders: {totalCylinderQty}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Returning eligible empty cylinders? Matched exchanges receive the customer refill price.
                Any additional cylinders receive the full price (refill price + cylinder deposit).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label
                  className={cn(
                    "p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all",
                    cylinderExchangeType === "refill"
                      ? "border-amber-500 bg-white ring-2 ring-amber-500/20 shadow-xs"
                      : "border-slate-200 bg-white/70 hover:bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name="cylinderExchange"
                    checked={cylinderExchangeType === "refill"}
                    onChange={() => {
                      setCylinderExchangeType("refill");
                      setReturnedEmptyCount(totalCylinderQty);
                    }}
                    className="mt-1"
                  />
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold text-slate-900 block">
                      Yes — Returning Empty Cylinders
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block">
                      Refill pricing applied to matched cylinder exchanges.
                    </span>
                  </div>
                </label>

                <label
                  className={cn(
                    "p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all",
                    cylinderExchangeType === "new"
                      ? "border-emerald-500 bg-white ring-2 ring-emerald-500/20 shadow-xs"
                      : "border-slate-200 bg-white/70 hover:bg-white",
                  )}
                >
                  <input
                    type="radio"
                    name="cylinderExchange"
                    checked={cylinderExchangeType === "new"}
                    onChange={() => {
                      setCylinderExchangeType("new");
                      setReturnedEmptyCount(0);
                    }}
                    className="mt-1"
                  />
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold text-slate-900 block">
                      No Empty Cylinders (Full Price)
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block">
                      Full cylinder price applied to all cylinders (adds refundable security deposit).
                    </span>
                  </div>
                </label>
              </div>

              {/* Returning empty cylinder details inputs */}
              {cylinderExchangeType === "refill" && (
                <div className="p-4 rounded-2xl bg-white border border-amber-200 space-y-3 mt-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Returned Cylinder Type</Label>
                      <select
                        value={returnedCylinderType}
                        onChange={(e) => setReturnedCylinderType(e.target.value)}
                        className="w-full mt-1.5 p-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                      >
                        <option value="Calor Propane Cylinder">Calor Propane Cylinder</option>
                        <option value="Calor Butane Cylinder">Calor Butane Cylinder</option>
                        <option value="Calor Patio Gas Cylinder">Calor Patio Gas Cylinder (Clip-On)</option>
                        <option value="Calor FLT Automotive Cylinder">Calor FLT Forklift Cylinder</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Number of Empty Cylinders Returned (Max: {totalCylinderQty})
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={totalCylinderQty}
                        value={returnedEmptyCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          setReturnedEmptyCount(Math.min(Math.max(1, val), totalCylinderQty));
                        }}
                        className="mt-1.5 rounded-xl text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Real-time exchange calculation breakdown */}
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold">Exchange Breakdown: </span>
                      <span className="text-emerald-700 font-extrabold">
                        {Math.min(returnedEmptyCount, totalCylinderQty)} refill exchange(s)
                      </span>
                      {totalCylinderQty > returnedEmptyCount && (
                        <span className="text-amber-800 font-extrabold ml-1.5">
                          • {totalCylinderQty - returnedEmptyCount} additional full-price (+£39.99 deposit each)
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Flowchart Rule: Matched exchanges get refill price.
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Section 2: Payment Details */}
          <section className="surface-card p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 font-display">Payment Method</h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Lock className="h-3.5 w-3.5 text-emerald-600" />
                <span>256-bit Encrypted</span>
              </div>
            </div>

            {/* Payment Method Selector (Card, PayPal, Cash, Credit Account) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none",
                  paymentMethod === "card"
                    ? "border-primary bg-red-50/30 ring-2 ring-primary/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center",
                      paymentMethod === "card"
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center",
                      paymentMethod === "card"
                        ? "border-primary bg-primary text-white"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {paymentMethod === "card" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    Credit / Debit Card
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Elavon 3DS2 Gateway</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("paypal")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none",
                  paymentMethod === "paypal"
                    ? "border-[#0079C1] bg-sky-50/40 ring-2 ring-[#0079C1]/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center",
                      paymentMethod === "paypal"
                        ? "bg-[#0079C1]/10 text-[#0079C1]"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    <PayPalIcon className="h-4 w-4" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center",
                      paymentMethod === "paypal"
                        ? "border-[#0079C1] bg-[#0079C1] text-white"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {paymentMethod === "paypal" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">PayPal</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Fast, secure checkout</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cod")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none",
                  paymentMethod === "cod"
                    ? "border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center",
                      paymentMethod === "cod"
                        ? "bg-amber-600 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    <Banknote className="h-4 w-4" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center",
                      paymentMethod === "cod"
                        ? "border-amber-600 bg-amber-600 text-white"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {paymentMethod === "cod" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">Cash</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Pay on delivery/collection</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("credit_account")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none",
                  paymentMethod === "credit_account"
                    ? "border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-600/20 shadow-xs"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50",
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-xl flex items-center justify-center",
                      paymentMethod === "credit_account"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600",
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full border flex items-center justify-center",
                      paymentMethod === "credit_account"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {paymentMethod === "credit_account" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-900 block">Credit Account</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">30-day invoice terms</p>
                </div>
              </button>
            </div>

            {/* Credit Account Information Section */}
            {paymentMethod === "credit_account" && (
              <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    <span className="font-extrabold text-emerald-950 text-sm">
                      Commercial Credit Facility Verification
                    </span>
                  </div>
                  {creditFacilityStatus?.approved ? (
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                      Account Approved
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="font-bold text-[10px]">
                      Approval Required
                    </Badge>
                  )}
                </div>

                {creditFacilityStatus?.approved ? (
                  <div className="space-y-2 text-slate-700">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Approved Limit</span>
                        <span className="text-xs font-black text-slate-900">{gbp(creditFacilityStatus.creditLimit)}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Available Credit</span>
                        <span className="text-xs font-black text-emerald-700">{gbp(creditFacilityStatus.availableCredit)}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Terms Status</span>
                        <span className={cn(
                          "text-xs font-black",
                          creditFacilityStatus.withinTerms ? "text-emerald-700" : "text-red-700"
                        )}>
                          {creditFacilityStatus.withinTerms ? "Within Credit Terms" : "Exceeds Limit"}
                        </span>
                      </div>
                    </div>
                    {!creditFacilityStatus.withinTerms && (
                      <p className="text-red-700 font-bold text-[11px] bg-red-50 p-2 rounded-lg border border-red-200">
                        {creditFacilityStatus.error || "Order total exceeds your available credit facility."}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                    <p className="font-bold">Credit Account Facility Required</p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Your account does not currently have an approved commercial credit facility.
                      Please select <strong>Credit / Debit Card</strong> or <strong>Cash</strong>, or apply for credit terms with depot management.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Card Details if Card Selected */}
            {paymentMethod === "card" && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4 shadow-inner/5">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Card Payment (Elavon Converge Gateway)
                    </span>
                  </div>
                  <span className="text-xs font-black text-primary">{gbp(total)}</span>
                </div>

                <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      Bank-Grade Hosted Checkout
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-700">
                        VISA
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-700">
                        MC
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-700">
                        AMEX
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Card details are securely captured through Elavon’s PCI-DSS Level 1 hosted
                    payment interface with Strong Customer Authentication (3D Secure 2). No
                    sensitive card numbers ever touch or are stored on our servers.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      <span>EMV 3-D Secure 2 (SCA) Verified</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span>256-Bit TLS End-to-End Encryption</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/80 p-3 flex items-center justify-between text-xs">
                  <span className="text-emerald-900 font-medium">Total Payable Amount:</span>
                  <span className="text-sm font-black text-emerald-950 font-display">
                    {gbp(total)}
                  </span>
                </div>
              </div>
            )}

            {/* PayPal Section if PayPal Selected */}
            {paymentMethod === "paypal" && (
              <div className="p-5 sm:p-6 rounded-2xl bg-sky-50/40 border border-sky-200/80 space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-sky-100 pb-3">
                  <div className="flex items-center gap-2">
                    <PayPalIcon className="h-5 w-5" />
                    <span className="text-xs font-black text-slate-900 tracking-wide">
                      Pay with <span className="text-[#003087]">Pay</span>
                      <span className="text-[#0079C1]">Pal</span>
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#003087]">{gbp(total)}</span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <p>
                    Online PayPal gateway integration is currently in onboarding. To complete your
                    order immediately, please select <strong>Credit / Debit Card</strong> (processed
                    securely via Elavon) or <strong>Pay on Delivery</strong>.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-sky-800 font-medium">
                    <ShieldCheck className="h-4 w-4 text-[#0079C1] shrink-0" />
                    <span>Protected by 256-bit encryption.</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/80 border border-sky-100 p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Total Payable Amount:</span>
                  <span className="text-sm font-black text-slate-900">{gbp(total)}</span>
                </div>
              </div>
            )}

            {/* Pay on Delivery if COD Selected */}
            {paymentMethod === "cod" && (
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 space-y-2 text-left">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                  <p className="font-extrabold flex items-center gap-1.5 text-amber-950">
                    <Banknote className="h-4 w-4 text-amber-700" /> Pay upon Delivery / Collection
                  </p>
                  <span className="font-black text-amber-950">{gbp(total)}</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  You will pay directly to our driver or at the Gloucestershire depot when your
                  order is delivered or collected. No payment is charged right now.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Aside: Order Summary */}
        <aside className="surface-card h-fit p-6 lg:sticky lg:top-32 space-y-4 text-left">
          <h2 className="text-base font-black text-slate-900 font-display">Order Summary</h2>
          {cartLoading ? (
            <p className="text-xs text-muted-foreground">Verifying basket with database...</p>
          ) : (
            <ul className="space-y-3 text-xs divide-y divide-slate-100">
              {lines.map((l) => {
                const isCylinder = isRefillableLpgCylinderProduct(l.product);
                const { gasType, cylinderSize } = parseGasTypeAndSize(l.product);
                const resolved = resolveCustomerGasPrice(l.product, customerPricing);
                const isReturning = cylinderExchangeType === "refill";
                const matchedCount = isReturning ? Math.min(l.qty, returnedEmptyCount) : 0;
                const fullCount = l.qty - matchedCount;

                return (
                  <li key={l.slug} className="pt-2 first:pt-0 space-y-1">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-900 block truncate">
                          {l.qty} × {l.product.name}
                        </span>
                        {isCylinder && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                              {gasType} • {cylinderSize}
                            </span>
                            <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold">
                              Band {resolved.bandNumber}
                            </span>
                            {resolved.isSpecialPrice && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                                Special Account ({resolved.specialCustomerCode})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="font-black text-slate-900 shrink-0 text-right">
                        {gbp(
                          isCylinder
                            ? matchedCount * resolved.unitRefillPrice + fullCount * resolved.unitFullPrice
                            : l.product.price * l.qty
                        )}
                      </span>
                    </div>

                    {isCylinder && (
                      <div className="text-[11px] text-slate-500 space-y-0.5 pl-1 border-l-2 border-slate-200">
                        <div className="flex justify-between">
                          <span>Refill Units ({matchedCount}x):</span>
                          <span className="font-semibold text-slate-700">
                            {matchedCount > 0 ? gbp(matchedCount * resolved.unitRefillPrice) : "£0.00"}
                          </span>
                        </div>
                        {fullCount > 0 && (
                          <div className="flex justify-between text-amber-800">
                            <span>Full-price Units ({fullCount}x + deposit):</span>
                            <span className="font-semibold">
                              {gbp(fullCount * resolved.unitFullPrice)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>VAT Treatment:</span>
                          <span>{resolved.vatStatus.replace(/_/g, " ")}</span>
                        </div>
                        {resolved.requiresClientClarification && (
                          <p className="text-[10px] text-amber-700 font-bold bg-amber-50 p-1 rounded">
                            Weston 12KG Band 12: £38.25 Inc / £33.57 Exc (clarification preserved)
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <dl className="space-y-2 border-t border-slate-100 pt-4 text-xs font-medium">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd className="font-bold text-slate-900">{gbp(subtotal)}</dd>
            </div>
            {offerDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/80 p-1.5 rounded-md border border-emerald-200/60">
                <dt className="flex items-center gap-1">
                  <span>Promo Offer Discount</span>
                </dt>
                <dd>− {gbp(offerDiscount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <dt>
                {fulfilmentMethod === "collection" ? "Click & Collect Fee" : (settings?.deliveryTierName || "Delivery")}
                {customerPricing.pricingBand && !["10", "20"].includes(customerPricing.pricingBand) && (
                  <span className="text-[10px] text-emerald-700 block font-bold">
                    (Discounted Band — Fee Waived)
                  </span>
                )}
              </dt>
              <dd className="font-bold text-slate-900">
                {shipping === 0 ? (
                  <span className="text-emerald-700 font-bold">
                    {settings?.freeDeliveryEnabled ? "Free" : "£0.00"}
                  </span>
                ) : (
                  gbp(shipping)
                )}
              </dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>
                VAT (
                {settings?.taxEnabled && (settings?.vatRate ?? 0) > 0
                  ? `${settings.vatRate}%`
                  : "0%"}
                {settings?.taxPricingMode === "inclusive" ? " incl." : ""}
                )
              </dt>
              <dd className="font-bold text-slate-900">{gbp(vat)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-black text-slate-900">
              <dt>Total</dt>
              <dd className="text-primary">{gbp(total)}</dd>
            </div>
          </dl>

          <Button
            type="submit"
            size="lg"
            disabled={
              submitting ||
              isProcessingPayment ||
              isVerifyingPayment ||
              cartLoading ||
              lines.length === 0 ||
              !isEmailVerified
            }
            className={cn(
              "mt-4 w-full rounded-full gap-2 h-12 font-black text-sm transition-all cursor-pointer shadow-md",
              !isEmailVerified
                ? "bg-slate-200 text-slate-500 border border-slate-300 hover:bg-slate-200 cursor-not-allowed"
                : paymentMethod === "paypal"
                  ? "bg-[#0079C1] hover:bg-[#00457C] text-white"
                  : "bg-primary hover:bg-primary/90 text-white",
            )}
          >
            {isVerifyingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying payment with Elavon...</span>
              </>
            ) : isProcessingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {paymentMethod === "card" ? "Connecting to Elavon Gateway..." : "Processing..."}
                </span>
              </>
            ) : submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : !isEmailVerified ? (
              <>
                <Mail className="h-4 w-4 mr-1 text-slate-400" />
                <span>Verify Email to Confirm Order</span>
              </>
            ) : paymentMethod === "card" ? (
              `Pay ${gbp(total)} with Card`
            ) : paymentMethod === "paypal" ? (
              `Pay ${gbp(total)} with PayPal`
            ) : (
              `Confirm & Place Order (${gbp(total)})`
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium text-center">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>Guaranteed Safe & Secure Checkout · Encrypted TLS</span>
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed px-2">
            By placing your order, you agree to John Stayte Services&apos;s{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-800 font-medium">
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-800 font-medium">
              Privacy Policy
            </a>
            .
          </p>
        </aside>
      </form>

      {/* Email Verification Required Dialog Modal */}
      <Dialog open={emailVerifyModalOpen} onOpenChange={setEmailVerifyModalOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 space-y-4">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900 font-display">
              Email Verification Required
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 font-medium leading-relaxed pt-1">
              For security and order confirmation, please enter the 6-digit verification code sent
              to your email.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-3">
            <p className="font-bold text-slate-900">Verification Code sent to:</p>
            <p className="font-mono text-primary font-bold text-sm bg-white p-2.5 rounded-xl border border-slate-200 break-all">
              {email}
            </p>

            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold text-slate-700">Enter 6-Digit Code:</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="rounded-xl text-center text-base tracking-[0.3em] font-mono font-black bg-white border-amber-300 h-10 flex-1"
                />
                <Button
                  type="button"
                  onClick={handleVerifyEmailOtp}
                  disabled={verifyingOtp || otpCode.trim().length !== 6}
                  className="rounded-xl text-xs font-bold bg-primary text-white h-10 px-4 shrink-0"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendEmailOtp}
              disabled={sendingOtp || cooldown > 0}
              className="rounded-full text-xs font-bold w-full sm:w-auto"
            >
              {sendingOtp ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Sending...
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Resend Code"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Verification In-Progress Modal */}
      <Dialog open={isVerifyingPayment}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 space-y-4 text-center [&>button]:hidden">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 font-display">
            Authorizing Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 font-medium leading-relaxed">
            Please wait while we authoritatively verify your transaction with the Elavon Converge
            Payment Gateway. Please do not close or refresh this page.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
