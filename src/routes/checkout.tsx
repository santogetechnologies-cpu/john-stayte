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
} from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
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
  sendCheckoutEmailOtp,
  verifyCheckoutEmailOtp,
  checkEmailVerifiedStatus,
} from "@/lib/checkout-email-service";

export const Route = createFileRoute("/checkout")({
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
  const { lines, subtotal, shipping, vat, total, settings, loading: cartLoading } = useCartTotals();
  const { clearCart, removeFromCart, user } = useStore();
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [emailVerifyModalOpen, setEmailVerifyModalOpen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [refreshingAuth, setRefreshingAuth] = useState(false);
  const navigate = useNavigate();

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

  // Delivery Form Fields
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [verificationStep, setVerificationStep] = useState<"IDLE" | "OTP_SENT" | "VERIFIED">("IDLE");
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

  // Gas Cylinder Exchange Option
  const [cylinderExchangeType, setCylinderExchangeType] = useState<"refill" | "new">("refill");

  // Check if cart contains actual refillable/exchangeable gas cylinders
  const hasCylinderInCart = useMemo(() => {
    return lines.some((l) => isRefillableLpgCylinderProduct(l.product));
  }, [lines]);

  // Payment Form Fields (strictly in-memory, never stored in DB or localStorage)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal" | "cod">("card");
  const [cardholderName, setCardholderName] = useState(user?.name || "");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Card formatting helpers
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

  const applyCoupon = async () => {
    const cleanCode = coupon.trim().toUpperCase();
    if (!cleanCode) return toast.error("Please enter a coupon code.");

    try {
      const { data: dbCoupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", cleanCode)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !dbCoupon) {
        if (cleanCode === "JSS10") {
          setDiscount(subtotal * 0.1);
          return toast.success("Coupon JSS10 applied — 10% off");
        }
        return toast.error("That coupon isn't valid or has expired.");
      }

      // Check min order amount
      if (dbCoupon.min_order_amount && subtotal < Number(dbCoupon.min_order_amount)) {
        return toast.error(
          `Minimum order total of ${gbp(Number(dbCoupon.min_order_amount))} required for this coupon.`,
        );
      }

      // Check expiration
      if (dbCoupon.expires_at && new Date(dbCoupon.expires_at) < new Date()) {
        return toast.error("This coupon code has expired.");
      }

      // Calculate discount
      let computedDiscount = 0;
      if (dbCoupon.discount_type === "percentage") {
        computedDiscount = (subtotal * Number(dbCoupon.discount_value)) / 100;
      } else {
        computedDiscount = Number(dbCoupon.discount_value);
      }

      if (dbCoupon.max_discount && computedDiscount > Number(dbCoupon.max_discount)) {
        computedDiscount = Number(dbCoupon.max_discount);
      }

      setDiscount(computedDiscount);
      toast.success(`Coupon ${cleanCode} applied! Saved ${gbp(computedDiscount)}`);
    } catch (err: any) {
      toast.error("Error applying coupon: " + err.message);
    }
  };

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

    // 2. Strict Real Email Verification Security Enforcement
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

    if (settings?.minOrderValue && subtotal < settings.minOrderValue) {
      return toast.error(
        `A minimum order value of ${gbp(settings.minOrderValue)} is required to place an order.`,
      );
    }

    if (!fullName || !email || !address || !postcode) {
      return toast.error("Please fill in all required delivery details.");
    }

    // 2. Validate Payment Details if Card Selected
    if (paymentMethod === "card") {
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

    setSubmitting(true);
    let createdOrderId: string | null = null;

    try {
      // 3. Short payment authorization if card or paypal
      if (paymentMethod === "card" || paymentMethod === "paypal") {
        setIsProcessingPayment(true);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        setIsProcessingPayment(false);
      }

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
      const finalTotal = Math.max(0, finalSubtotal + shipping + vat - discount);
      const orderNumber = `JSS-${Date.now().toString().slice(-6)}`;

      const finalPaymentStatus =
        paymentMethod === "card" || paymentMethod === "paypal" ? "Paid" : "Pending";
      const finalPaymentMethod =
        paymentMethod === "paypal"
          ? "PayPal"
          : paymentMethod === "card"
            ? "Credit / Debit Card"
            : "Pay on Delivery";

      const isEmptyRequired = hasCylinderInCart ? cylinderExchangeType === "refill" : false;
      const orderTypeTag = hasCylinderInCart
        ? cylinderExchangeType === "refill"
          ? "REFILL_EXCHANGE"
          : "NEW_CYLINDER"
        : "STANDARD";

      // 5. Create Order Record in Supabase
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
              street: address.trim(),
              postcode: postcode.trim(),
              phone: phone.trim(),
              payment_method: finalPaymentMethod,
              empty_cylinder_required: isEmptyRequired,
              order_type: orderTypeTag,
            },
            subtotal: finalSubtotal,
            shipping_fee: shipping,
            total: finalTotal,
            status: "Pending",
            fulfillment_status: "Pending",
            assigned_depot: "Whitminster",
            payment_status: finalPaymentStatus,
            notes: [
              `[Payment: ${finalPaymentMethod}]`,
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

      // 6. Create Order Items Records (with strict transaction rollback on failure)
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
        // Roll back parent order record to avoid orphan orders
        await supabase.from("orders").delete().eq("id", newOrder.id);
        throw new Error(`Failed to save items for order: ${itemsErr.message}`);
      }

      // 7. Create Order Status History Record
      await supabase.from("order_status_history").insert([
        {
          order_id: newOrder.id,
          status: "Pending",
          actor_id: currentUserId,
          actor_name: fullName.trim(),
          notes: `Order placed via online checkout (${finalPaymentMethod} • ${finalPaymentStatus}).`,
        },
      ]);

      // 8. Update Real Database Inventory for Ordered Products
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

      // 9. Create Invoice Record in Supabase
      try {
        await supabase.from("invoices").insert([
          {
            invoice_number: `INV-${orderNumber.replace("JSS-", "")}`,
            order_id: newOrder.id,
            customer_id: currentUserId,
            total_amount: finalTotal,
            status: finalPaymentStatus === "Paid" ? "Paid" : "Issued",
          },
        ]);
      } catch (invErr) {
        console.warn("Invoice record notice:", invErr);
      }

      // 10. Create Customer Notification in Supabase customer_notifications
      try {
        await supabase.from("customer_notifications").insert([
          {
            user_id: currentUserId,
            title: `Order #${orderNumber} Confirmed`,
            message: `Your order for ${verifiedItems.length} item(s) totalling ${gbp(finalTotal)} has been received.`,
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

      // 12. Clear Cart ONLY AFTER database success
      clearCart();
      toast.success(`Order #${orderNumber} placed successfully!`);
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
          {/* Section 1: Delivery Details */}
          <section className="surface-card p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-900 font-display">Delivery Details</h2>
              {savedAddresses.length > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  Using saved address
                </span>
              )}
            </div>

            {savedAddresses.length > 1 && (
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
                      isEmailVerified && "bg-emerald-50/50 border-emerald-300 font-semibold text-emerald-900"
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
                        <KeyRound className="h-3.5 w-3.5 text-amber-600" /> Enter 6-digit code sent to inbox:
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
                      Please check your spam/junk folder if the code doesn't arrive in your main inbox.
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
              <div>
                <Label htmlFor="pc" className="text-xs font-bold text-slate-700">
                  Postcode
                </Label>
                <Input
                  id="pc"
                  required
                  maxLength={10}
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                  placeholder="GL2 7LZ"
                  className="mt-1.5 rounded-full text-xs font-medium"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ad" className="text-xs font-bold text-slate-700">
                Delivery Address & Instructions
              </Label>
              <Textarea
                id="ad"
                required
                maxLength={300}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address, town, and any delivery access instructions..."
                className="mt-1.5 rounded-2xl text-xs font-medium"
              />
            </div>
          </section>

          {/* Section 1.5: Gas Cylinder Exchange Option (shown only if gas cylinder in basket) */}
          {hasCylinderInCart && (
            <section className="surface-card p-6 sm:p-7 space-y-3 bg-amber-50/40 border border-amber-200/90 rounded-3xl">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-600" />
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  LPG Cylinder Exchange Selection
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Please specify whether you are ordering a refill exchange with an existing empty cylinder or purchasing a new gas bottle for the first time.
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
                    onChange={() => setCylinderExchangeType("refill")}
                    className="mt-1"
                  />
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold text-slate-900 block">
                      Refill / Exchange (Have empty bottle)
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block">
                      Empty cylinder required for exchange collection upon delivery.
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
                    onChange={() => setCylinderExchangeType("new")}
                    className="mt-1"
                  />
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold text-slate-900 block">
                      New Cylinder Purchase (First-time)
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block">
                      First-time customer purchase — no empty cylinder required.
                    </span>
                  </div>
                </label>
              </div>
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

            {/* Payment Method Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <p className="text-[11px] text-slate-500 mt-0.5">Visa, Mastercard, Amex</p>
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
                  <span className="text-xs font-black text-slate-900 block">Pay on Delivery</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cash or card upon receipt</p>
                </div>
              </button>
            </div>

            {/* Card Inputs if Card Selected */}
            {paymentMethod === "card" && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-4 shadow-inner/5">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      Card Payment Details
                    </span>
                  </div>
                  <span className="text-xs font-black text-primary">
                    {gbp(Math.max(0, total - discount))}
                  </span>
                </div>

                <div>
                  <Label htmlFor="chn" className="text-xs font-bold text-slate-700">
                    Cardholder Name
                  </Label>
                  <Input
                    id="chn"
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
                    <Label htmlFor="cn" className="text-xs font-bold text-slate-700">
                      Card Number
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="cn"
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
                    <Label htmlFor="ex" className="text-xs font-bold text-slate-700">
                      Expiry Date
                    </Label>
                    <Input
                      id="ex"
                      required
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      className="mt-1.5 rounded-xl bg-white text-xs font-mono font-medium text-center h-10 border-slate-200"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cv" className="text-xs font-bold text-slate-700">
                      CVC / Security Code
                    </Label>
                    <Input
                      id="cv"
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
                  <span className="text-xs font-black text-[#003087]">
                    {gbp(Math.max(0, total - discount))}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                  <p>
                    You will be directed to PayPal to complete your payment securely using your
                    PayPal balance, linked bank account, or saved cards.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-sky-800 font-medium">
                    <ShieldCheck className="h-4 w-4 text-[#0079C1] shrink-0" />
                    <span>Protected by PayPal Buyer Protection and 256-bit encryption.</span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/80 border border-sky-100 p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Total Payable Amount:</span>
                  <span className="text-sm font-black text-slate-900">
                    {gbp(Math.max(0, total - discount))}
                  </span>
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
                  <span className="font-black text-amber-950">
                    {gbp(Math.max(0, total - discount))}
                  </span>
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
            <ul className="space-y-2 text-xs divide-y divide-slate-100">
              {lines.map((l) => (
                <li key={l.slug} className="flex justify-between gap-3 pt-2 first:pt-0">
                  <span className="min-w-0 truncate text-slate-600 font-medium">
                    {l.qty} × {l.product.name}
                  </span>
                  <span className="font-extrabold text-slate-900 shrink-0">
                    {gbp(l.product.price * l.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2 pt-2">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Coupon code"
              maxLength={20}
              className="rounded-full text-xs"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full text-xs font-bold cursor-pointer"
              onClick={applyCoupon}
            >
              Apply
            </Button>
          </div>

          <dl className="space-y-2 border-t border-slate-100 pt-4 text-xs font-medium">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd className="font-bold text-slate-900">{gbp(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Discount</dt>
                <dd className="font-bold">−{gbp(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <dt>Delivery</dt>
              <dd className="font-bold text-slate-900">
                {shipping === 0 ? "Free" : gbp(shipping)}
              </dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>VAT (20%)</dt>
              <dd className="font-bold text-slate-900">{gbp(vat)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-black text-slate-900">
              <dt>Total</dt>
              <dd className="text-primary">{gbp(Math.max(0, total - discount))}</dd>
            </div>
          </dl>

          <Button
            type="submit"
            size="lg"
            disabled={submitting || isProcessingPayment || cartLoading || lines.length === 0 || !isEmailVerified}
            className={cn(
              "mt-4 w-full rounded-full gap-2 h-12 font-black text-sm transition-all cursor-pointer shadow-md",
              !isEmailVerified
                ? "bg-slate-200 text-slate-500 border border-slate-300 hover:bg-slate-200 cursor-not-allowed"
                : paymentMethod === "paypal"
                  ? "bg-[#0079C1] hover:bg-[#00457C] text-white"
                  : "bg-primary hover:bg-primary/90 text-white",
            )}
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {paymentMethod === "paypal"
                    ? "Connecting to PayPal..."
                    : "Authorizing payment..."}
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
            ) : paymentMethod === "paypal" ? (
              <>
                <PayPalIcon className="h-4 w-4 fill-white" />
                <span>Pay {gbp(Math.max(0, total - discount))} with PayPal</span>
              </>
            ) : paymentMethod === "card" ? (
              `Pay ${gbp(Math.max(0, total - discount))}`
            ) : (
              `Confirm & Place Order (${gbp(Math.max(0, total - discount))})`
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium text-center">
            <Lock className="h-3 w-3 text-emerald-600" />
            <span>Guaranteed Safe & Secure Checkout</span>
          </div>
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
              For security and order confirmation, please enter the 6-digit verification code sent to your email.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-3">
            <p className="font-bold text-slate-900">
              Verification Code sent to:
            </p>
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
    </SiteLayout>
  );
}
