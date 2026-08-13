import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: "og:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://stayte-hub-suite.lovable.app/og-image.jpg" },
      { title: "Sign In or Register | John Stayte Services" },
      { name: "description", content: "Sign in to your John Stayte Services account to track orders, download invoices and reorder gas." },
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

  // Register Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // General State
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Forgot Password Modal
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetting, setResetting] = useState(false);

  // Role routing
  const redirectByRole = (role: string) => {
    navigate({
      to: role === "admin" ? "/admin" : role === "manager" ? "/manager" : "/account",
    });
  };

  // Handle Real Supabase Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!signInEmail || !signInPassword) {
      return setFormError("Please enter both email address and password.");
    }

    setLoading(true);

    try {
      const res = await login(signInEmail, signInPassword);
      setLoading(false);

      if (!res.ok || !res.user) {
        setFormError(res.error || "Invalid email address or password.");
        return;
      }

      toast.success(`Welcome back, ${res.user.name}`);
      redirectByRole(res.user.role);
    } catch (err: any) {
      setLoading(false);
      setFormError("Unable to sign in. Please check your credentials and try again.");
    }
  };

  // Handle Real Supabase Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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
        setFormError(res.error || "Unable to create your account. Please try again.");
        return;
      }

      toast.success("Account created successfully!");
      navigate({ to: "/account" });
    } catch (err: any) {
      setLoading(false);
      setFormError("Registration failed. Please try again later.");
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

  return (
    <SiteLayout>
      <div className="bg-slate-50/70 py-10 lg:py-16 min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="container-page max-w-5xl w-full">
          {/* TWO-COLUMN RESPONSIVE LAYOUT */}
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* LEFT COLUMN: BRAND WELCOME & VALUE PROP (5 cols) */}
            <div className="lg:col-span-5 space-y-6 w-full">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 mb-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Account Access
                </span>
                <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-slate-900 leading-tight">
                  {tab === "signin" ? "Welcome back." : "Create your account."}
                </h1>
                <p className="text-sm text-slate-600 font-medium mt-2.5 leading-relaxed">
                  {tab === "signin"
                    ? "Sign in to manage your John Stayte Services orders, invoices, and gas deliveries in one secure portal."
                    : "Register for an account to manage LPG gas orders, track dispatches, and access quick refills."}
                </p>
              </div>

              {/* BRAND BENEFIT BADGES */}
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5 transition-all hover:border-slate-300">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Track Deliveries</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Real-time status updates on gas cylinder dispatches
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5 transition-all hover:border-slate-300">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Invoices & Statements</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Download PDF invoices and billing statements
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-3.5 transition-all hover:border-slate-300">
                  <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0 border border-amber-200/60">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Fast Reordering</p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      1-click propane & butane bottle refills
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: POLISHED AUTHENTICATION CARD (7 cols) */}
            <div className="lg:col-span-7 w-full">
              <div className="surface-card p-6 sm:p-8 rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-200/50 space-y-6">
                
                {/* CARD HEADER & SEGMENTED TABS SWITCH */}
                <div className="space-y-4 border-b border-slate-100 pb-5">
                  <div>
                    <h2 className="text-xl font-display font-extrabold tracking-tight text-slate-900">
                      {tab === "signin" ? "Sign In" : "Create an Account"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Access your John Stayte Services account.
                    </p>
                  </div>

                  {/* Segmented Switch */}
                  <div className="p-1 rounded-2xl bg-slate-100/90 border border-slate-200/60 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTab("signin");
                        setFormError(null);
                      }}
                      className={`py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                        tab === "signin"
                          ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Sign In
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTab("register");
                        setFormError(null);
                      }}
                      className={`py-2.5 text-xs font-extrabold rounded-xl transition-all ${
                        tab === "register"
                          ? "bg-white text-slate-900 shadow-xs border border-slate-200/40"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Register
                    </button>
                  </div>
                </div>

                {/* INLINE FORM ERROR BANNER */}
                {formError && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-3 text-xs text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">{formError}</p>
                  </div>
                )}

                {/* TAB 1: SIGN IN FORM */}
                {tab === "signin" && (
                  <form onSubmit={handleSignIn} className="space-y-4 text-xs font-medium">
                    <div>
                      <Label htmlFor="signin-email" className="font-bold text-slate-700">
                        Email Address
                      </Label>
                      <div className="relative mt-1.5">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signin-email"
                          type="email"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="pl-10 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="signin-password" className="font-bold text-slate-700">
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => setForgotModal(true)}
                          className="text-[11px] font-bold text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative mt-1.5">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="signin-password"
                          type={showSignInPassword ? "text" : "password"}
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-10 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      size="lg"
                      className="w-full rounded-full font-extrabold text-xs shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-11 mt-2 gap-2 transition-all hover:scale-[1.01]"
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

                {/* TAB 2: REGISTER FORM */}
                {tab === "register" && (
                  <form onSubmit={handleRegister} className="space-y-4 text-xs font-medium">
                    <div>
                      <Label htmlFor="reg-name" className="font-bold text-slate-700">
                        Full Name
                      </Label>
                      <div className="relative mt-1.5">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="reg-name"
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="John Smith"
                          className="pl-10 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="reg-email" className="font-bold text-slate-700">
                          Email Address
                        </Label>
                        <div className="relative mt-1.5">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="reg-email"
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="john@example.com"
                            className="pl-10 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="reg-phone" className="font-bold text-slate-700">
                          Phone Number
                        </Label>
                        <div className="relative mt-1.5">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="reg-phone"
                            type="tel"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="07700 900123"
                            className="pl-10 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="reg-password" className="font-bold text-slate-700">
                          Password
                        </Label>
                        <div className="relative mt-1.5">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="reg-password"
                            type={showRegPassword ? "text" : "password"}
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                            className="pl-10 pr-10 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="reg-confirm" className="font-bold text-slate-700">
                          Confirm Password
                        </Label>
                        <div className="relative mt-1.5">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="reg-confirm"
                            type={showRegPassword ? "text" : "password"}
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="pl-10 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* PASSWORD REQUIREMENTS CHECKLIST */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-[11px]">
                      <p className="font-bold text-slate-700">Password requirements:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-slate-500 font-medium">
                        <span className={hasMinLen ? "text-emerald-600 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
                          <CheckCircle2 className="h-3 w-3" /> Min 8 chars
                        </span>
                        <span className={hasUppercase ? "text-emerald-600 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
                          <CheckCircle2 className="h-3 w-3" /> 1 Uppercase
                        </span>
                        <span className={hasNumber ? "text-emerald-600 font-bold flex items-center gap-1" : "flex items-center gap-1"}>
                          <CheckCircle2 className="h-3 w-3" /> 1 Number
                        </span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      size="lg"
                      className="w-full rounded-full font-extrabold text-xs shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-11 mt-2 gap-2 transition-all hover:scale-[1.01]"
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
                <div className="pt-4 border-t border-slate-100 text-center">
                  <p className="text-[11px] text-slate-400 font-medium inline-flex items-center justify-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Your account is protected by 256-bit secure authentication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD DIALOG */}
      <Dialog open={forgotModal} onOpenChange={setForgotModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-extrabold text-lg">Reset Password</DialogTitle>
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
                className="mt-1 rounded-xl text-xs font-semibold h-11 border-slate-200/90 focus-visible:ring-primary"
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
                className="rounded-full font-bold text-xs gap-1.5 shadow-md shadow-primary/20 bg-primary hover:bg-primary/90 text-white"
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
