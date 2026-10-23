import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ShieldCheck,
  Truck,
  FileText,
  Flame,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  Calendar,
  Check,
  ChevronDown,
  X,
  Search,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogPortal,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { speakLoginError, speakLoginSuccess } from "@/lib/auth-voice";
import { cn } from "@/lib/utils";
import { sendPasswordResetEmailServerFn } from "@/lib/password-reset-server-fn";
import { validateDob, MONTHS, getBirthYears } from "@/lib/dob-validator";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Sign In or Register | John Stayte Services" },
      {
        name: "description",
        content:
          "Sign in to your John Stayte Services account to track orders, download invoices and reorder gas.",
      },
      { property: "og:title", content: "Sign In | John Stayte Services" },
      { property: "og:description", content: "Access your customer, manager or admin dashboard." },
    ],
  }),
  component: LoginPage,
});

const DECADE_PILLS = [
  { label: "All", value: "all" },
  { label: "2000s", value: "2000" },
  { label: "1990s", value: "1990" },
  { label: "1980s", value: "1980" },
  { label: "1970s", value: "1970" },
];

function LoginPage() {
  const { login, register, resendConfirmationEmail, user, authLoading } = useStore();
  const navigate = useNavigate();

  // Active Tab
  const [tab, setTab] = useState<"signin" | "register">("signin");

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register Form State (Starts completely empty)
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Date of Birth (DOB) Age Verification State
  const [dobModalOpen, setDobModalOpen] = useState(false);
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [isAgeVerified, setIsAgeVerified] = useState(false);

  // Year selector popover & search state
  const [yearPopoverOpen, setYearPopoverOpen] = useState(false);
  const [yearSearch, setYearSearch] = useState("");
  const [selectedDecade, setSelectedDecade] = useState("all");
  const yearScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const selectedYearButtonRef = useRef<HTMLButtonElement | null>(null);

  // Email Confirmation State
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState<string | null>(null);
  const [unconfirmedLoginEmail, setUnconfirmedLoginEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [confirmedSuccessBanner, setConfirmedSuccessBanner] = useState(false);

  // General State
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "success" | "error">("idle");

  // Forgot Password Modal
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  // Set New Password (Recovery) Modal State
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(null);

  // Subtle Mouse Parallax State
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const rect = currentTarget.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  // Role routing
  const redirectByRole = useCallback(
    (role: string) => {
      navigate({
        to:
          role === "admin"
            ? "/admin"
            : role === "manager"
              ? "/manager"
              : role === "delivery_agent"
                ? "/delivery"
                : "/account",
      });
    },
    [navigate],
  );

  // Check for email confirmation redirect or error params in URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const isConfirmed =
        searchParams.get("confirmed") === "true" || hashParams.get("type") === "signup";
      const isRecovery =
        hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";

      if (isRecovery) {
        setIsRecoveryMode(true);
      }

      const errorDesc =
        searchParams.get("error_description") ||
        hashParams.get("error_description") ||
        (searchParams.get("error") ? "Email link is invalid or has expired." : null);

      if (errorDesc) {
        const decoded = decodeURIComponent(errorDesc.replace(/\+/g, " "));
        setFormError(decoded);
        toast.error(decoded);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (isConfirmed) {
        setConfirmedSuccessBanner(true);
        toast.success("Email verified successfully! You can now sign in to your account.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // Non-blocking URL parse
    }
  }, []);

  // Listen for Supabase password recovery event
  useEffect(() => {
    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });
    return () => authSub?.subscription?.unsubscribe();
  }, []);

  // Cooldown timer for resending confirmation email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-redirect if customer is already authenticated (or becomes authenticated via session detection)
  useEffect(() => {
    if (user && !authLoading && !isRecoveryMode) {
      if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
        return;
      }
      redirectByRole(user.role);
    }
  }, [user, authLoading, isRecoveryMode, redirectByRole]);

  // Handle Resend Confirmation Email
  const handleResendConfirmation = async (targetEmail: string) => {
    if (!targetEmail || resending || resendCooldown > 0) return;
    setResending(true);
    try {
      const res = await resendConfirmationEmail(targetEmail);
      if (res.ok) {
        toast.success(res.message || "Confirmation email sent! Please check your inbox.");
        setResendCooldown(60);
      } else {
        toast.error(res.error || "Failed to resend confirmation email.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  // Handle Real Supabase Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAuthStatus("idle");
    setUnconfirmedLoginEmail(null);

    if (!signInEmail || !signInPassword) {
      setAuthStatus("error");
      if (!signInEmail || !signInEmail.includes("@")) {
        speakLoginError("wrong email", signInEmail);
      } else {
        speakLoginError("Sign in failed. Please check your details and try again.", signInEmail);
      }
      return setFormError("Please enter both email address and password.");
    }

    setLoading(true);

    try {
      const res = await login(signInEmail, signInPassword);
      setLoading(false);

      if (!res.ok || !res.user) {
        setAuthStatus("error");
        setFormError(res.error || "Invalid email or password.");
        if (res.emailNotConfirmed) {
          setUnconfirmedLoginEmail(res.unconfirmedEmail || signInEmail.trim());
        }
        speakLoginError(res.error, signInEmail);
        setTimeout(() => setAuthStatus("idle"), 1500);
        return;
      }

      // Real Authentication Success Animation & Role-Aware Voice Feedback
      setAuthStatus("success");
      speakLoginSuccess(res.user.role);
      toast.success(`Welcome back, ${res.user.name}`);
      setTimeout(() => {
        redirectByRole(res.user!.role);
      }, 500);
    } catch (err: any) {
      setLoading(false);
      setAuthStatus("error");
      setFormError("Unable to sign in. Please check your credentials and try again.");
      speakLoginError(err?.message || "Unable to sign in.", signInEmail);
      setTimeout(() => setAuthStatus("idle"), 1500);
    }
  };

  // Execute Real Supabase Registration after Age Verification
  const executeAccountCreation = async () => {
    if (!isAgeVerified) {
      setFormError("Please confirm that you are 18 years old or above.");
      return;
    }
    if (loading) return;

    setLoading(true);
    setFormError(null);
    setAuthStatus("idle");

    try {
      // Prioritize customer privacy: full DOB is NEVER passed to register or stored in Supabase
      // Only the verified boolean flag is recorded in auth metadata for legal 18+ eligibility compliance
      const res = await register(
        regName.trim(),
        regEmail.trim(),
        regPassword,
        "customer",
        true, // is18Confirmed
      );
      setLoading(false);

      if (!res.ok) {
        setAuthStatus("error");
        setFormError(res.error || "Unable to create your account. Please try again.");
        setTimeout(() => setAuthStatus("idle"), 1500);
        return;
      }

      // If Supabase Auth requires email confirmation (session is null)
      if (res.requiresEmailConfirmation) {
        setPendingEmailConfirmation(res.email || regEmail.trim());
        setResendCooldown(60);
        setAuthStatus("idle");
        toast.success("Account registered! Please check your email to activate your account.");
        return;
      }

      // Immediate session (e.g. auto-confirm enabled)
      setAuthStatus("success");
      toast.success("Account created successfully!");
      setTimeout(() => {
        navigate({ to: "/account" });
      }, 500);
    } catch (err: any) {
      setLoading(false);
      setAuthStatus("error");
      setFormError("Registration failed. Please try again later.");
      setTimeout(() => setAuthStatus("idle"), 1500);
    }
  };

  // Handle Form Submission: validates fields and triggers registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAuthStatus("idle");

    if (regName.trim().length < 2) {
      return setFormError("Please enter your full name.");
    }
    if (!regEmail.includes("@")) {
      return setFormError("Please enter a valid email address.");
    }
    if (regPassword.length < 8) {
      return setFormError("Password must be at least 8 characters long.");
    }
    if (!/[A-Z]/.test(regPassword)) {
      return setFormError("Password must contain at least one uppercase letter.");
    }
    if (!/[0-9]/.test(regPassword)) {
      return setFormError("Password must contain at least one number.");
    }
    if (regPassword !== regConfirmPassword) {
      return setFormError("Passwords do not match. Please re-enter.");
    }

    // Require 18+ confirmation checkbox
    if (!isAgeVerified) {
      const msg = "Please confirm that you are 18 years old or above.";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    // Proceed with registration
    await executeAccountCreation();
  };

  // Handle Confirmation of Date of Birth inside Modal
  const handleConfirmDob = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDobError(null);

    // Ephemeral calculation: used ONLY to verify the customer is at least 18
    const validation = validateDob(dobYear, dobMonth, dobDay);
    if (!validation.valid) {
      setDobError(validation.error || "You must be at least 18 years old to create an account.");
      return;
    }

    // Customer privacy: Do NOT store the full DOB in Supabase, profiles, localStorage, or state!
    // Discard raw day, month, year immediately and retain only the minimal verification boolean.
    setIsAgeVerified(true);
    setDobDay("");
    setDobMonth("");
    setDobYear("");
    setDobModalOpen(false);

    if (formError === "Please confirm that you are 18 years old or above.") {
      setFormError(null);
    }
    toast.success("Age verified successfully (18+ confirmed)");
  };

  // Handle Cancelling Date of Birth Modal
  const handleCancelDobModal = () => {
    setDobModalOpen(false);
    setDobError(null);
    setDobDay("");
    setDobMonth("");
    setDobYear("");
    setIsAgeVerified(false);
  };

  // Handle 18+ Checkbox Toggle
  const handleToggleAgeCheckbox = () => {
    if (isAgeVerified) {
      // Uncheck / reset age confirmation
      setIsAgeVerified(false);
      setDobDay("");
      setDobMonth("");
      setDobYear("");
    } else {
      // Checking the checkbox opens the Verify Your Age modal
      setDobError(null);
      setDobDay("");
      setDobMonth("");
      setDobYear("");
      setDobModalOpen(true);
    }
  };

  // Handle Password Reset Request
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes("@")) {
      return toast.error("Please provide a valid email address.");
    }
    setResetting(true);

    try {
      const res = await sendPasswordResetEmailServerFn({
        data: {
          email: resetEmail.trim(),
          redirectTo: `${window.location.origin}/login`,
        },
      });

      if (!res.ok) {
        if (res.error === "Rate limit reached") {
          toast.warning(res.message);
        } else {
          toast.error(res.message || "Failed to send reset email.");
        }
        return;
      }

      toast.success(
        res.message ||
          "If an account exists with this email address, you will receive password reset instructions shortly.",
      );
      setForgotModal(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset link. Please try again later.");
    } finally {
      setResetting(false);
    }
  };

  // Handle Password Update after Recovery
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordUpdateError(null);

    if (newPassword.length < 8) {
      setPasswordUpdateError("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPasswordUpdateError("Password must include at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordUpdateError("Password must include at least one number.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordUpdateError("Passwords do not match. Please re-enter.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully! Welcome back.");
      setIsRecoveryMode(false);
      setNewPassword("");
      setConfirmNewPassword("");
      if (typeof window !== "undefined") {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      navigate({ to: "/account" });
    } catch (err: any) {
      const msg = err?.message || "Failed to update password. Please request a new reset link.";
      setPasswordUpdateError(msg);
      toast.error(msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Password Validation Checklist
  const hasMinLen = regPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);

  // Dynamic days in month calculation with leap year support
  const availableDaysCount = useMemo(() => {
    const month = parseInt(dobMonth, 10);
    if (!month || isNaN(month)) return 31;
    const year = parseInt(dobYear, 10) || 2024;
    return new Date(year, month, 0).getDate();
  }, [dobMonth, dobYear]);

  // Automatically clamp selected day if it exceeds the days in newly selected month/year
  useEffect(() => {
    if (dobDay && dobMonth) {
      const dayNum = parseInt(dobDay, 10);
      if (!isNaN(dayNum) && dayNum > availableDaysCount) {
        setDobDay(String(availableDaysCount));
      }
    }
  }, [dobMonth, dobYear, dobDay, availableDaysCount]);

  const allBirthYears = useMemo(() => getBirthYears(), []);

  const filteredYears = useMemo(() => {
    let list = allBirthYears;

    const searchTrimmed = yearSearch.trim();
    const isFourDigitSearch = searchTrimmed.length === 4;

    // Filter by decade unless the user enters a full 4-digit search
    if (selectedDecade !== "all" && !isFourDigitSearch) {
      const decStart = parseInt(selectedDecade, 10);
      if (!isNaN(decStart)) {
        list = list.filter((y) => y >= decStart && y < decStart + 10);
      }
    }

    if (searchTrimmed) {
      list = list.filter((y) => String(y).includes(searchTrimmed));
    }

    return list;
  }, [allBirthYears, selectedDecade, yearSearch]);

  // Scroll selected year button into view when year popover opens
  useEffect(() => {
    if (yearPopoverOpen && dobYear) {
      const timer = setTimeout(() => {
        if (selectedYearButtonRef.current) {
          selectedYearButtonRef.current.scrollIntoView({
            block: "center",
            behavior: "instant",
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [yearPopoverOpen, dobYear, selectedDecade]);

  // Ensure mouse-wheel and trackpad scrolling work without being trapped by parent modal scroll lock
  useEffect(() => {
    const el = yearScrollContainerRef.current;
    if (!el || !yearPopoverOpen) return;

    const handleWheel = (e: WheelEvent) => {
      if (el.scrollHeight > el.clientHeight) {
        e.stopPropagation();
        el.scrollTop += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [yearPopoverOpen, filteredYears]);
  const signInBenefits = [
    "Track your orders in real-time",
    "View and download invoices",
    "Manage deliveries and refills",
    "Enjoy a faster, safer and more reliable service",
  ];

  const registerBenefits = [
    "Fast online LPG ordering and instant quotes",
    "Track cylinder dispatches directly to your site",
    "Schedule automated scheduled refills anytime",
    "Access 24/7 emergency LPG support services",
  ];

  const activeBenefits = tab === "signin" ? signInBenefits : registerBenefits;

  return (
    <SiteLayout>
      <section
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative min-h-[calc(100vh-120px)] lg:min-h-[860px] flex items-center justify-center overflow-hidden bg-[#fafbfe] py-10 lg:py-16"
      >
        {/* INTEGRATED SEAMLESS 3D SCENE BACKDROP (WITH CYLINDERS & PODIUM) */}
        <div
          className={`absolute inset-0 pointer-events-none transition-all duration-700 ease-out z-0 ${
            authStatus === "success"
              ? "scale-[1.04] brightness-105"
              : authStatus === "error"
                ? "scale-[1.01] brightness-95"
                : ""
          }`}
          style={{
            backgroundImage: "url('/login-hero-bg.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            transform: `scale(1.02) translate(${mouseOffset.x * 6}px, ${mouseOffset.y * 5}px) ${
              authStatus === "success"
                ? "translateY(-6px)"
                : authStatus === "error"
                  ? "translateY(3px)"
                  : ""
            }`,
          }}
        />

        {/* SOFT ATMOSPHERIC AMBIENT GLOW & RED LIGHTING ACCENTS */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-white/35 pointer-events-none z-[1]" />

        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/2 w-[550px] h-[550px] rounded-full blur-[130px] pointer-events-none transition-all duration-1000 ease-out z-[1] ${
            authStatus === "success"
              ? "bg-emerald-500/20 scale-110"
              : authStatus === "error"
                ? "bg-red-600/25 scale-95"
                : "bg-red-500/12"
          }`}
          style={{
            transform: `translate(${mouseOffset.x * -10}px, ${mouseOffset.y * -10}px)`,
          }}
        />

        {/* MAIN BALANCED THREE-COLUMN COMPOSITION CONTAINER */}
        <div className="relative z-10 w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 xl:gap-12 items-center">
            {/* ======================================================== */}
            {/* 1. LEFT COLUMN: RICH WELCOME SECTION (5 cols)             */}
            {/* ======================================================== */}
            <div
              className="lg:col-span-5 space-y-6 sm:space-y-7 transition-transform duration-500 ease-out"
              style={{
                transform: `translate(${mouseOffset.x * -4}px, ${mouseOffset.y * -4}px)`,
              }}
            >
              {/* Main Welcome Header Block */}
              <div className="space-y-4">
                {/* Account Access Red Pill Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-[11.5px] font-black tracking-widest text-[#e31b23] bg-red-50/90 border border-red-200/60 shadow-xs backdrop-blur-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e31b23]"></span>
                  </span>
                  ACCOUNT ACCESS
                </div>

                {/* Static Heading (+12% scale) */}
                <h1 className="text-4xl sm:text-[44px] xl:text-[54px] font-display font-black tracking-tight text-slate-900 leading-[1.12]">
                  {tab === "signin" ? (
                    <>
                      Welcome <span className="text-[#e31b23]">back.</span>
                    </>
                  ) : (
                    <>
                      Create <span className="text-[#e31b23]">account.</span>
                    </>
                  )}
                </h1>

                {/* Static Subtitle (Enhanced readability) */}
                <p className="text-[15px] sm:text-base text-slate-600 font-medium leading-relaxed max-w-md pt-0.5">
                  {tab === "signin"
                    ? "Sign in to manage your John Stayte Services orders, invoices, and gas deliveries in one secure portal."
                    : "Register for an account to manage LPG gas orders, track dispatches, and access quick refills."}
                </p>
              </div>

              {/* Feature Checklist (Slightly larger label and items) */}
              <div className="space-y-3.5 pt-1">
                <p className="text-[13px] font-bold tracking-wider uppercase text-slate-500">
                  {tab === "signin" ? "Access your account to:" : "Account benefits include:"}
                </p>

                <div className="space-y-3">
                  {activeBenefits.map((benefit, idx) => (
                    <div key={`${tab}-benefit-${idx}`} className="flex items-center gap-3.5">
                      <div className="h-5.5 w-5.5 rounded-full bg-red-50 border border-red-200/80 flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="h-4 w-4 text-[#e31b23]" />
                      </div>
                      <span className="text-sm sm:text-[15px] font-semibold text-slate-700 leading-snug">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Minimal Brand Trust Tagline */}
              <div className="pt-3.5 border-t border-slate-200/60 text-[13px] sm:text-sm text-slate-500 font-semibold tracking-wide flex items-center gap-3">
                <span className="h-[2px] w-8 bg-[#e31b23] rounded-full shrink-0" />
                Trusted LPG Energy Delivery Since 1972
              </div>
            </div>

            {/* ======================================================== */}
            {/* 2. CENTER COLUMN: SEAMLESS 3D VISUAL STAGE GAP (2 cols)  */}
            {/* ======================================================== */}
            {/* The 3D cylinders are positioned cleanly in the backdrop */}
            <div className="hidden lg:flex lg:col-span-2 items-center justify-center min-h-[420px] pointer-events-none select-none relative">
              {/* Dynamic atmospheric lighting reaction during auth */}
              <div
                className={`w-64 h-32 rounded-full blur-3xl transition-all duration-700 ease-out ${
                  authStatus === "success"
                    ? "bg-emerald-400/25 scale-125"
                    : authStatus === "error"
                      ? "bg-red-600/30 scale-90"
                      : "bg-red-500/15"
                }`}
                style={{
                  transform: `translate(${mouseOffset.x * 15}px, ${mouseOffset.y * 10}px)`,
                }}
              />
            </div>

            {/* ======================================================== */}
            {/* 3. RIGHT COLUMN: TALLER & SPACIOUS REFINED AUTH CARD (5 cols) */}
            {/* ======================================================== */}
            <div
              className={`lg:col-span-5 w-full max-w-[460px] mx-auto lg:ml-auto transition-all duration-500 ease-out ${
                authStatus === "error" ? "animate-shake" : ""
              }`}
              style={{
                transform: `translate(${mouseOffset.x * 3}px, ${mouseOffset.y * 3}px) ${
                  authStatus === "success"
                    ? "translateY(-4px)"
                    : authStatus === "error"
                      ? "translateY(2px)"
                      : ""
                }`,
              }}
            >
              {/* Outer Card Wrapper with Subtle Red Backlight Halo */}
              <div className="relative group">
                {/* Red ambient backlight behind card */}
                <div
                  className={`absolute -inset-2 rounded-[34px] blur-2xl opacity-60 transition-all duration-500 -z-10 pointer-events-none ${
                    authStatus === "success"
                      ? "bg-emerald-500/20 opacity-90"
                      : authStatus === "error"
                        ? "bg-red-600/30 opacity-90"
                        : "bg-gradient-to-r from-red-500/18 via-red-600/12 to-red-400/18"
                  }`}
                />

                {/* Frosted Glass Sign In / Register Card (More Vertical Height & Spaciousness) */}
                <div className="p-7 sm:p-9 lg:p-9.5 rounded-[30px] bg-white/95 sm:bg-white/90 backdrop-blur-2xl border border-white/95 shadow-[0_20px_50px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
                  {pendingEmailConfirmation ? (
                    <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
                      <div className="mx-auto w-16 h-16 rounded-full bg-red-50 border border-red-200/80 flex items-center justify-center text-[#e31b23] shadow-md shadow-red-500/10">
                        <Mail className="h-8 w-8" />
                      </div>

                      <div className="space-y-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-[#e31b23] bg-red-50 border border-red-200/60">
                          CONFIRMATION LINK SENT
                        </span>
                        <h2 className="text-2xl font-display font-black tracking-tight text-slate-900">
                          Check your email
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-sm mx-auto">
                          We've sent an activation link to{" "}
                          <strong className="text-slate-900 font-bold break-all">
                            {pendingEmailConfirmation}
                          </strong>
                          . Click the link in your email to activate your account and start ordering
                          gas.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/60 text-left flex items-start gap-3 text-xs text-amber-900">
                        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="font-medium text-[11.5px] leading-relaxed">
                          Can't find the email? Check your <strong>Spam</strong> or{" "}
                          <strong>Junk</strong> folder.
                        </p>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        <Button
                          type="button"
                          disabled={resending || resendCooldown > 0}
                          onClick={() => handleResendConfirmation(pendingEmailConfirmation)}
                          className="w-full rounded-full font-black text-xs sm:text-sm shadow-md bg-[#e31b23] hover:bg-[#c9151c] text-white h-11 transition-all cursor-pointer disabled:opacity-60"
                        >
                          {resending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Resending...
                            </>
                          ) : resendCooldown > 0 ? (
                            `Resend link in ${resendCooldown}s`
                          ) : (
                            "Resend Confirmation Email"
                          )}
                        </Button>

                        <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-600 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPendingEmailConfirmation(null);
                              setTab("signin");
                              setFormError(null);
                              setUnconfirmedLoginEmail(null);
                            }}
                            className="text-[#e31b23] hover:underline cursor-pointer"
                          >
                            Return to Sign In
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingEmailConfirmation(null);
                            }}
                            className="text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                          >
                            Edit Registration
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* CARD HEADER */}
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-2xl font-display font-black tracking-tight text-slate-900">
                            {tab === "signin" ? "Sign In" : "Create an Account"}
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                            {tab === "signin"
                              ? "Access your John Stayte Services account."
                              : "Fill in your details to create a secure account."}
                          </p>
                        </div>

                        {/* Segmented Switch */}
                        <div className="p-1 rounded-2xl bg-slate-100/90 border border-slate-200/60 grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTab("signin");
                              setFormError(null);
                              setAuthStatus("idle");
                              setUnconfirmedLoginEmail(null);
                            }}
                            className={`py-2.5 text-xs font-black rounded-xl transition-all duration-200 cursor-pointer ${
                              tab === "signin"
                                ? "bg-[#e31b23] text-white shadow-md shadow-red-500/25 scale-[1.01]"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Sign In
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTab("register");
                              setFormError(null);
                              setAuthStatus("idle");
                              setUnconfirmedLoginEmail(null);
                            }}
                            className={`py-2.5 text-xs font-black rounded-xl transition-all duration-200 cursor-pointer ${
                              tab === "register"
                                ? "bg-[#e31b23] text-white shadow-md shadow-red-500/25 scale-[1.01]"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Register
                          </button>
                        </div>
                      </div>

                      {/* CONFIRMED SUCCESS BANNER */}
                      {confirmedSuccessBanner && (
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-start gap-3 text-xs text-emerald-800 animate-in fade-in duration-200">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                          <p className="font-bold leading-relaxed">
                            Your email has been confirmed! Please sign in with your password to
                            continue.
                          </p>
                        </div>
                      )}

                      {/* UNCONFIRMED EMAIL SIGN IN NOTICE */}
                      {unconfirmedLoginEmail && tab === "signin" && (
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col gap-2.5 text-xs text-amber-900 animate-in fade-in duration-200">
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <p className="font-semibold leading-relaxed">
                              This account's email has not been confirmed yet. Please verify your
                              email to log in.
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            disabled={resending || resendCooldown > 0}
                            onClick={() => handleResendConfirmation(unconfirmedLoginEmail)}
                            className="self-start rounded-full text-xs font-bold h-8 px-4 bg-amber-700 hover:bg-amber-800 text-white cursor-pointer shadow-xs"
                          >
                            {resending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : null}
                            {resendCooldown > 0
                              ? `Resend link in ${resendCooldown}s`
                              : "Resend confirmation email"}
                          </Button>
                        </div>
                      )}

                      {/* INLINE FORM ERROR BANNER */}
                      {formError && !unconfirmedLoginEmail && (
                        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-200">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#e31b23]" />
                          <p className="font-bold leading-relaxed">{formError}</p>
                        </div>
                      )}

                      {/* TAB 1: SIGN IN FORM */}
                      {tab === "signin" && (
                        <form onSubmit={handleSignIn} className="space-y-4.5 text-xs font-medium">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="signin-email"
                              className="font-bold text-slate-800 text-xs"
                            >
                              Email Address
                            </Label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                id="signin-email"
                                type="email"
                                value={signInEmail}
                                onChange={(e) => setSignInEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="pl-11 rounded-xl text-xs sm:text-sm font-semibold h-12 bg-slate-50/70 border-slate-200/80 hover:border-slate-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-[#e31b23]"
                                required
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label
                                htmlFor="signin-password"
                                className="font-bold text-slate-800 text-xs"
                              >
                                Password
                              </Label>
                              <button
                                type="button"
                                onClick={() => setForgotModal(true)}
                                className="text-[11px] font-bold text-[#e31b23] hover:text-[#b3141b] hover:underline transition-colors cursor-pointer"
                              >
                                Forgot password?
                              </button>
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                id="signin-password"
                                type={showSignInPassword ? "text" : "password"}
                                value={signInPassword}
                                onChange={(e) => setSignInPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pl-11 pr-11 rounded-xl text-xs sm:text-sm font-semibold h-12 bg-slate-50/70 border-slate-200/80 hover:border-slate-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-[#e31b23]"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowSignInPassword(!showSignInPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                              >
                                {showSignInPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          <Button
                            type="submit"
                            disabled={loading}
                            size="lg"
                            className="w-full rounded-full font-black text-xs sm:text-sm shadow-lg shadow-red-500/25 bg-[#e31b23] hover:bg-[#c9151c] text-white h-12 mt-3 gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                              </>
                            ) : (
                              <>
                                Sign In <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      )}

                      {/* TAB 2: REGISTER FORM (Completely empty default fields) */}
                      {tab === "register" && (
                        <form onSubmit={handleRegister} className="space-y-4 text-xs font-medium">
                          <div className="space-y-1.5">
                            <Label htmlFor="reg-name" className="font-bold text-slate-800 text-xs">
                              Full Name
                            </Label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input
                                id="reg-name"
                                type="text"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                placeholder="Full name"
                                className="pl-11 rounded-xl text-xs sm:text-sm font-semibold h-11 bg-slate-50/70 border-slate-200/80 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-[#e31b23]"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="reg-email"
                                className="font-bold text-slate-800 text-xs"
                              >
                                Email Address
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  id="reg-email"
                                  type="email"
                                  value={regEmail}
                                  onChange={(e) => setRegEmail(e.target.value)}
                                  placeholder="name@example.com"
                                  className="pl-11 rounded-xl text-xs font-semibold h-11 bg-slate-50/70 border-slate-200/80 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-[#e31b23]"
                                  required
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="reg-phone"
                                className="font-bold text-slate-800 text-xs"
                              >
                                Phone Number
                              </Label>
                              <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  id="reg-phone"
                                  type="tel"
                                  value={regPhone}
                                  onChange={(e) => setRegPhone(e.target.value)}
                                  placeholder="Phone number"
                                  className="pl-11 rounded-xl text-xs font-semibold h-11 bg-slate-50/70 border-slate-200/80 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-[#e31b23]"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label
                                htmlFor="reg-password"
                                className="font-bold text-slate-800 text-xs"
                              >
                                Password
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  id="reg-password"
                                  type={showRegPassword ? "text" : "password"}
                                  value={regPassword}
                                  onChange={(e) => setRegPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="pl-11 pr-11 rounded-xl text-xs font-semibold h-11 bg-slate-50/70 border-slate-200/80 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-[#e31b23]"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowRegPassword(!showRegPassword)}
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                  aria-label={showRegPassword ? "Hide password" : "Show password"}
                                >
                                  {showRegPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label
                                htmlFor="reg-confirm"
                                className="font-bold text-slate-800 text-xs"
                              >
                                Confirm Password
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  id="reg-confirm"
                                  type={showRegPassword ? "text" : "password"}
                                  value={regConfirmPassword}
                                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                                  placeholder="••••••••"
                                  className="pl-11 rounded-xl text-xs font-semibold h-11 bg-slate-50/70 border-slate-200/80 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-[#e31b23]"
                                  required
                                />
                              </div>
                            </div>
                          </div>

                          {/* PASSWORD REQUIREMENTS CHECKLIST */}
                          <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 space-y-1.5 text-[11px]">
                            <p className="font-bold text-slate-700">Password requirements:</p>
                            <div className="grid grid-cols-3 gap-1 text-slate-500 font-medium">
                              <span
                                className={
                                  hasMinLen
                                    ? "text-emerald-600 font-bold flex items-center gap-1"
                                    : "flex items-center gap-1"
                                }
                              >
                                <CheckCircle2 className="h-3 w-3 shrink-0" /> 8+ chars
                              </span>
                              <span
                                className={
                                  hasUppercase
                                    ? "text-emerald-600 font-bold flex items-center gap-1"
                                    : "flex items-center gap-1"
                                }
                              >
                                <CheckCircle2 className="h-3 w-3 shrink-0" /> 1 Uppercase
                              </span>
                              <span
                                className={
                                  hasNumber
                                    ? "text-emerald-600 font-bold flex items-center gap-1"
                                    : "flex items-center gap-1"
                                }
                              >
                                <CheckCircle2 className="h-3 w-3 shrink-0" /> 1 Number
                              </span>
                            </div>
                          </div>

                          {/* 18+ AGE CONFIRMATION CHECKBOX */}
                          <div
                            className={cn(
                              "p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 select-none",
                              isAgeVerified
                                ? "bg-[#F0FDF4] border-[#22C55E] shadow-xs shadow-emerald-500/10"
                                : "bg-white border-slate-200/90 hover:border-slate-300",
                            )}
                          >
                            <button
                              type="button"
                              id="reg-age-confirmation-checkbox"
                              role="checkbox"
                              aria-checked={isAgeVerified}
                              onClick={handleToggleAgeCheckbox}
                              className="flex items-center gap-3 text-left w-full cursor-pointer group focus:outline-none"
                            >
                              <div
                                className={cn(
                                  "w-5.5 h-5.5 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                                  isAgeVerified
                                    ? "bg-[#22C55E] text-white shadow-xs shadow-emerald-500/30 scale-100"
                                    : "border-2 border-slate-300 bg-white group-hover:border-slate-400",
                                )}
                              >
                                {isAgeVerified ? (
                                  <Check className="h-3.5 w-3.5 stroke-[3] text-white" />
                                ) : null}
                              </div>
                              <span
                                className={cn(
                                  "text-xs leading-snug transition-colors",
                                  isAgeVerified
                                    ? "font-bold text-slate-900"
                                    : "font-medium text-slate-700",
                                )}
                              >
                                I confirm that I am 18 years old or above.
                              </span>
                            </button>

                            {isAgeVerified && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDobError(null);
                                  setDobDay("");
                                  setDobMonth("");
                                  setDobYear("");
                                  setDobModalOpen(true);
                                }}
                                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0 cursor-pointer ml-1"
                              >
                                Edit DOB
                              </button>
                            )}
                          </div>

                          <Button
                            type="submit"
                            disabled={loading}
                            size="lg"
                            className="w-full rounded-full font-black text-xs sm:text-sm shadow-lg shadow-red-500/25 bg-[#e31b23] hover:bg-[#c9151c] text-white h-12 mt-2 gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                              </>
                            ) : (
                              <>
                                Create Account <ArrowRight className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      )}
                    </>
                  )}

                  {/* TRUST / SECURITY FOOTER */}
                  <div className="pt-3 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-slate-400 font-medium inline-flex items-center justify-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Protected by 256-bit secure authentication.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DATE OF BIRTH (DOB) AGE VERIFICATION MODAL */}
      <Dialog
        open={dobModalOpen}
        onOpenChange={(open) => {
          setDobModalOpen(open);
          if (!open) {
            setDobError(null);
            if (!isAgeVerified) {
              setDobDay("");
              setDobMonth("");
              setDobYear("");
            }
          }
        }}
      >
        <DialogPortal>
          {/* Subtle backdrop overlay with soft blur */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

          {/* Premium 24px rounded white modal card (480-520px desktop width) */}
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-[495px] translate-x-[-50%] translate-y-[-50%] gap-5 rounded-[24px] border border-slate-200/90 bg-white p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 max-h-[92vh] overflow-y-auto outline-none">
            {/* Header: Circular red icon, title, subtitle & top-right close button */}
            <div className="flex items-start justify-between gap-3.5">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-full bg-red-50 border border-red-100/90 flex items-center justify-center text-[#e31b23] shrink-0 shadow-xs mt-0.5">
                  <Calendar className="h-5 w-5 stroke-[2.2] text-[#e31b23]" />
                </div>
                <div className="space-y-1 text-left">
                  <DialogTitle className="font-display font-extrabold text-xl text-slate-900 tracking-tight leading-tight">
                    Verify Your Age
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-[13px] text-slate-500 font-medium leading-relaxed">
                    Enter your date of birth to confirm you’re eligible to create an account.
                  </DialogDescription>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelDobModal}
                className="w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/20 -mr-1 -mt-1"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmDob} className="space-y-4 pt-1 text-xs">
              {/* Inline DOB Error Banner */}
              {dobError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/90 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#e31b23]" />
                  <p className="font-bold leading-relaxed">{dobError}</p>
                </div>
              )}

              {/* Selectors Grid: Day, Month, Year - Custom-styled dropdown components */}
              <div className="grid grid-cols-3 gap-3">
                {/* 1. Day Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="dob-day-trigger" className="block text-xs font-bold text-slate-700">
                    Day
                  </Label>
                  <Select
                    value={dobDay}
                    onValueChange={(val) => {
                      setDobDay(val);
                      setDobError(null);
                    }}
                  >
                    <SelectTrigger
                      id="dob-day-trigger"
                      className="h-11 w-full rounded-xl border-slate-200/90 bg-slate-50/80 px-3.5 text-xs sm:text-[13px] font-bold text-slate-900 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 focus:border-[#e31b23] focus:bg-white focus:ring-2 focus:ring-red-500/20 data-[placeholder]:text-slate-400 data-[placeholder]:font-medium cursor-pointer"
                    >
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={6}
                      className="z-[9999] max-h-[220px] rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl"
                    >
                      {Array.from({ length: availableDaysCount }, (_, i) => i + 1).map((d) => (
                        <SelectItem
                          key={d}
                          value={String(d)}
                          className="rounded-xl py-2 text-xs font-semibold cursor-pointer focus:bg-red-50 focus:text-slate-900 data-[state=checked]:bg-red-50 data-[state=checked]:font-bold data-[state=checked]:text-[#e31b23]"
                        >
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Month Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="dob-month-trigger" className="block text-xs font-bold text-slate-700">
                    Month
                  </Label>
                  <Select
                    value={dobMonth}
                    onValueChange={(val) => {
                      setDobMonth(val);
                      setDobError(null);
                    }}
                  >
                    <SelectTrigger
                      id="dob-month-trigger"
                      className="h-11 w-full rounded-xl border-slate-200/90 bg-slate-50/80 px-3.5 text-xs sm:text-[13px] font-bold text-slate-900 shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 focus:border-[#e31b23] focus:bg-white focus:ring-2 focus:ring-red-500/20 data-[placeholder]:text-slate-400 data-[placeholder]:font-medium cursor-pointer truncate"
                    >
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      sideOffset={6}
                      className="z-[9999] max-h-[240px] rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl"
                    >
                      {MONTHS.map((m) => (
                        <SelectItem
                          key={m.value}
                          value={m.value}
                          className="rounded-xl py-2 text-xs font-semibold cursor-pointer focus:bg-red-50 focus:text-slate-900 data-[state=checked]:bg-red-50 data-[state=checked]:font-bold data-[state=checked]:text-[#e31b23]"
                        >
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Year Selector (Compact, Searchable & Decade-Navigable) */}
                <div className="space-y-1.5">
                  <Label htmlFor="dob-year-trigger" className="block text-xs font-bold text-slate-700">
                    Year
                  </Label>
                  <Popover
                    modal={true}
                    open={yearPopoverOpen}
                    onOpenChange={(open) => {
                      setYearPopoverOpen(open);
                      if (open) {
                        setYearSearch("");
                        if (dobYear) {
                          const yNum = parseInt(dobYear, 10);
                          if (yNum >= 2000 && yNum < 2010) setSelectedDecade("2000");
                          else if (yNum >= 1990 && yNum < 2000) setSelectedDecade("1990");
                          else if (yNum >= 1980 && yNum < 1990) setSelectedDecade("1980");
                          else if (yNum >= 1970 && yNum < 1980) setSelectedDecade("1970");
                          else setSelectedDecade("all");
                        } else {
                          setSelectedDecade("all");
                        }
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        id="dob-year-trigger"
                        className={cn(
                          "flex h-11 w-full items-center justify-between rounded-xl border border-slate-200/90 bg-slate-50/80 px-3.5 text-xs sm:text-[13px] shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50 focus:border-[#e31b23] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 cursor-pointer",
                          yearPopoverOpen && "border-[#e31b23] bg-white ring-2 ring-red-500/20",
                          dobYear ? "font-bold text-slate-900" : "font-medium text-slate-400",
                        )}
                      >
                        <span className="truncate">{dobYear || "Year"}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
                            yearPopoverOpen && "rotate-180 opacity-80 text-[#e31b23]",
                          )}
                        />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      sideOffset={6}
                      collisionPadding={12}
                      className="z-[9999] w-[285px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xl flex flex-col"
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      {/* Refined Header - Fixed at top */}
                      <div className="shrink-0 flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                          Select birth year
                        </span>
                        {dobYear && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Selected: <span className="font-bold text-[#e31b23]">{dobYear}</span>
                          </span>
                        )}
                      </div>

                      {/* Search Year Input - Fixed at top */}
                      <div className="shrink-0 relative mb-2.5">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Search year..."
                          value={yearSearch}
                          onChange={(e) =>
                            setYearSearch(e.target.value.replace(/\D/g, "").slice(0, 4))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && filteredYears.length > 0) {
                              e.preventDefault();
                              setDobYear(String(filteredYears[0]));
                              setDobError(null);
                              setYearPopoverOpen(false);
                            }
                          }}
                          className="h-8.5 w-full rounded-xl border border-slate-200/90 bg-slate-50/80 pl-8 pr-7 text-xs font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal transition-all focus:border-[#e31b23] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          autoFocus
                        />
                        {yearSearch && (
                          <button
                            type="button"
                            onClick={() => setYearSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                            aria-label="Clear search"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {/* Decade Filter Chips: All, 2000s, 1990s, 1980s, 1970s - Fixed at top */}
                      <div className="shrink-0 grid grid-cols-5 gap-1 pb-2.5 text-[11px]">
                        {DECADE_PILLS.map((pill) => {
                          const isActive = selectedDecade === pill.value && !yearSearch;
                          return (
                            <button
                              key={pill.value}
                              type="button"
                              onClick={() => {
                                setSelectedDecade(pill.value);
                                setYearSearch("");
                              }}
                              className={cn(
                                "flex h-7 items-center justify-center rounded-full text-[11px] transition-all cursor-pointer select-none",
                                isActive
                                  ? "bg-[#e31b23] text-white font-bold shadow-xs scale-[1.02]"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 font-semibold",
                              )}
                            >
                              {pill.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Year Grid Container: Independently vertically scrollable */}
                      <div
                        ref={yearScrollContainerRef}
                        tabIndex={0}
                        onWheel={(e) => {
                          e.stopPropagation();
                          const el = e.currentTarget;
                          if (el.scrollHeight > el.clientHeight) {
                            el.scrollTop += e.deltaY;
                          }
                        }}
                        onTouchMove={(e) => e.stopPropagation()}
                        className="h-[210px] max-h-[38vh] overflow-y-auto overscroll-contain pr-1 pt-1 custom-scrollbar border-t border-slate-100/80 focus:outline-none"
                        style={{
                          WebkitOverflowScrolling: "touch",
                          touchAction: "pan-y",
                        }}
                      >
                        <div className="grid grid-cols-3 gap-1.5 pb-1">
                          {filteredYears.map((y) => {
                            const isSelected = dobYear === String(y);
                            const isExactSearchMatch =
                              yearSearch.trim().length === 4 && String(y) === yearSearch.trim();

                            return (
                              <button
                                key={y}
                                ref={isSelected ? selectedYearButtonRef : undefined}
                                type="button"
                                onClick={() => {
                                  setDobYear(String(y));
                                  setDobError(null);
                                  setYearPopoverOpen(false);
                                }}
                                className={cn(
                                  "flex h-8.5 items-center justify-center rounded-xl text-xs transition-all duration-150 cursor-pointer select-none",
                                  isSelected
                                    ? "bg-[#e31b23] text-white font-bold shadow-xs shadow-red-500/20 scale-[1.02]"
                                    : isExactSearchMatch
                                      ? "bg-red-50 text-[#e31b23] font-bold border border-[#e31b23] ring-1 ring-[#e31b23]/30"
                                      : "bg-slate-50/60 border border-slate-200/60 text-slate-700 hover:bg-red-50 hover:text-[#e31b23] hover:border-red-100 font-semibold",
                                )}
                              >
                                {y}
                              </button>
                            );
                          })}

                          {/* Clean Empty State */}
                          {filteredYears.length === 0 && (
                            <div className="col-span-3 py-6 px-3 flex flex-col items-center justify-center text-center animate-in fade-in duration-150">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1.5">
                                <Search className="h-3.5 w-3.5" />
                              </div>
                              <p className="text-xs font-bold text-slate-700">No matching year</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Try another year or reset filters
                              </p>
                              {(yearSearch || selectedDecade !== "all") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setYearSearch("");
                                    setSelectedDecade("all");
                                  }}
                                  className="mt-2 text-[11px] font-bold text-[#e31b23] hover:underline cursor-pointer"
                                >
                                  Reset filters
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Age Verification Helper Text in readable, properly spaced area */}
              <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-start gap-2.5 text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-[12.5px] font-medium leading-relaxed">
                  To create an account and purchase gas cylinders, you must be at least 18 years
                  old.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelDobModal}
                  disabled={loading}
                  className="w-full sm:w-auto h-11 px-5 rounded-full font-bold text-xs sm:text-sm bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 text-slate-700 shadow-xs cursor-pointer transition-all"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!dobDay || !dobMonth || !dobYear}
                  className="w-full sm:w-auto h-11 px-6 rounded-full font-black text-xs sm:text-sm bg-[#e31b23] hover:bg-[#c9151c] text-white shadow-md shadow-red-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-45 disabled:pointer-events-none disabled:shadow-none"
                >
                  Confirm Date of Birth
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* FORGOT PASSWORD DIALOG */}
      <Dialog open={forgotModal} onOpenChange={setForgotModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900">
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-2 text-xs">
            <p className="text-slate-600 font-medium">
              Enter your email address and we will send password reset instructions.
            </p>
            <div>
              <Label htmlFor="reset-email" className="font-bold text-slate-700">
                Email Address
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@example.com"
                className="mt-1 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-[#e31b23]"
                required
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setForgotModal(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetting}
                className="rounded-full font-bold text-xs gap-1.5 shadow-md shadow-red-500/20 bg-[#e31b23] hover:bg-[#c9151c] text-white"
              >
                {resetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {resetting ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* SET NEW PASSWORD (RECOVERY) DIALOG */}
      <Dialog
        open={isRecoveryMode}
        onOpenChange={(open) => {
          if (!open) {
            setIsRecoveryMode(false);
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#e31b23]" />
              Set New Password
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2 text-xs">
            <p className="text-slate-600 font-medium">
              Enter and confirm a new secure password for your John Stayte Services account.
            </p>

            {passwordUpdateError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{passwordUpdateError}</span>
              </div>
            )}

            <div>
              <Label htmlFor="new-password" className="font-bold text-slate-700">
                New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="rounded-xl text-xs font-semibold h-11 pr-10 border-slate-200/90 focus-visible:ring-[#e31b23]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-new-password" className="font-bold text-slate-700">
                Confirm New Password
              </Label>
              <Input
                id="confirm-new-password"
                type={showNewPassword ? "text" : "password"}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="mt-1 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-[#e31b23]"
                required
              />
            </div>

            {/* PASSWORD REQUIREMENTS CHECKLIST */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
              <p className="font-bold text-slate-700">Password requirements:</p>
              <div className="grid grid-cols-1 gap-1 text-slate-500">
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    newPassword.length >= 8 && "text-emerald-600 font-semibold",
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" /> At least 8 characters
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    /[A-Z]/.test(newPassword) && "text-emerald-600 font-semibold",
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" /> At least 1 uppercase letter
                </span>
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    /[0-9]/.test(newPassword) && "text-emerald-600 font-semibold",
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" /> At least 1 number
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsRecoveryMode(false);
                  if (typeof window !== "undefined") {
                    window.history.replaceState({}, document.title, window.location.pathname);
                  }
                }}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingPassword}
                className="rounded-full font-bold text-xs gap-1.5 shadow-md shadow-red-500/20 bg-[#e31b23] hover:bg-[#c9151c] text-white"
              >
                {updatingPassword && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {updatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
