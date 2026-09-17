import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

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



function LoginPage() {
  const { login, register } = useStore();
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

  // General State
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<"idle" | "success" | "error">("idle");

  // Forgot Password Modal
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

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
  const redirectByRole = (role: string) => {
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
  };

  // Handle Real Supabase Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setAuthStatus("idle");

    if (!signInEmail || !signInPassword) {
      setAuthStatus("error");
      return setFormError("Please enter both email address and password.");
    }

    setLoading(true);

    try {
      const res = await login(signInEmail, signInPassword);
      setLoading(false);

      if (!res.ok || !res.user) {
        setAuthStatus("error");
        setFormError(res.error || "Invalid email or password.");
        try {
          if ("speechSynthesis" in window) {
            const utter = new SpeechSynthesisUtterance("Wrong password.");
            utter.rate = 1.0;
            utter.pitch = 1.0;
            window.speechSynthesis.speak(utter);
          }
        } catch {
          // ignore speech error
        }
        setTimeout(() => setAuthStatus("idle"), 1500);
        return;
      }

      // Real Authentication Success Animation
      setAuthStatus("success");
      toast.success(`Welcome back, ${res.user.name}`);
      setTimeout(() => {
        redirectByRole(res.user!.role);
      }, 500);
    } catch (err: any) {
      setLoading(false);
      setAuthStatus("error");
      setFormError("Unable to sign in. Please check your credentials and try again.");
      setTimeout(() => setAuthStatus("idle"), 1500);
    }
  };

  // Handle Real Supabase Registration
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
    if (regPassword !== regConfirmPassword) {
      return setFormError("Passwords do not match. Please re-enter.");
    }

    setLoading(true);

    try {
      const res = await register(regName.trim(), regEmail.trim(), regPassword, "customer");
      setLoading(false);

      if (!res.ok) {
        setAuthStatus("error");
        setFormError(res.error || "Unable to create your account. Please try again.");
        setTimeout(() => setAuthStatus("idle"), 1500);
        return;
      }

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

  // Handle Password Reset Request
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes("@")) {
      return toast.error("Please provide a valid email address.");
    }
    setResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      toast.success("Password reset instructions sent to your email!");
      setForgotModal(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error("Failed to send reset link: " + err.message);
    } finally {
      setResetting(false);
    }
  };

  // Password Validation Checklist
  const hasMinLen = regPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(regPassword);
  const hasNumber = /[0-9]/.test(regPassword);

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
              authStatus === "success" ? "translateY(-6px)" : authStatus === "error" ? "translateY(3px)" : ""
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
                    <div
                      key={`${tab}-benefit-${idx}`}
                      className="flex items-center gap-3.5"
                    >
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

                  {/* INLINE FORM ERROR BANNER */}
                  {formError && (
                    <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-xs text-red-700 animate-in fade-in duration-200">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#e31b23]" />
                      <p className="font-bold leading-relaxed">{formError}</p>
                    </div>
                  )}

                  {/* TAB 1: SIGN IN FORM */}
                  {tab === "signin" && (
                    <form onSubmit={handleSignIn} className="space-y-4.5 text-xs font-medium">
                      <div className="space-y-1.5">
                        <Label htmlFor="signin-email" className="font-bold text-slate-800 text-xs">
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
                          <Label htmlFor="signin-password" className="font-bold text-slate-800 text-xs">
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
                          <Label htmlFor="reg-email" className="font-bold text-slate-800 text-xs">
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
                          <Label htmlFor="reg-phone" className="font-bold text-slate-800 text-xs">
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
                          <Label htmlFor="reg-password" className="font-bold text-slate-800 text-xs">
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
                          <Label htmlFor="reg-confirm" className="font-bold text-slate-800 text-xs">
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
                {resetting ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

