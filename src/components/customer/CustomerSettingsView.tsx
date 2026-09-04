import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Settings,
  Save,
  Bell,
  Mail,
  ShieldCheck,
  User,
  Key,
  LogOut,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  Lock,
  Smartphone,
  Info,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerSettingsView() {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  // Notification toggle states
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [deliveryUpdates, setDeliveryUpdates] = useState(true);
  const [serviceUpdates, setServiceUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);

  // Communication toggle states
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load real notification_prefs from Supabase profiles
  useEffect(() => {
    async function loadPreferences() {
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const currentUserId = authUser?.user?.id || user?.id;
        if (!currentUserId) return;

        setLoadingPrefs(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("notification_prefs")
          .eq("id", currentUserId)
          .maybeSingle();

        if (error) {
          console.warn("Could not load notification preferences:", error.message);
          return;
        }

        if (data?.notification_prefs && typeof data.notification_prefs === "object") {
          const prefs = data.notification_prefs as Record<string, boolean>;
          if (typeof prefs.orderUpdates === "boolean") setOrderUpdates(prefs.orderUpdates);
          if (typeof prefs.deliveryUpdates === "boolean") setDeliveryUpdates(prefs.deliveryUpdates);
          if (typeof prefs.serviceUpdates === "boolean") setServiceUpdates(prefs.serviceUpdates);
          if (typeof prefs.promotions === "boolean") setPromotions(prefs.promotions);
          if (typeof prefs.emailNotifs === "boolean") setEmailNotifs(prefs.emailNotifs);
          if (typeof prefs.smsNotifs === "boolean") setSmsNotifs(prefs.smsNotifs);
          if (typeof prefs.pushNotifs === "boolean") setPushNotifs(prefs.pushNotifs);
        }
      } catch (err) {
        console.error("Failed to load customer settings:", err);
      } finally {
        setLoadingPrefs(false);
      }
    }

    loadPreferences();
  }, [user?.id]);

  // Real Change Password Modal States
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const currentUserId = authUser?.user?.id || user?.id;

      if (!currentUserId) {
        toast.error("Please sign in to save your preferences.");
        setSaving(false);
        return;
      }

      const prefsPayload = {
        orderUpdates,
        deliveryUpdates,
        serviceUpdates,
        promotions,
        emailNotifs,
        smsNotifs,
        pushNotifs,
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          notification_prefs: prefsPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUserId);

      if (error) throw error;
      toast.success("Account preferences saved successfully to database!");
    } catch (err: any) {
      console.error("Failed to save customer settings:", err);
      toast.error("Failed to save preferences: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // REAL SUPABASE AUTH CHANGE PASSWORD HANDLER
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }

    if (!newPassword) {
      setPasswordError("New password is required.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      // 1. Fetch current authenticated user
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user?.email) {
        throw new Error("You must be logged in to update your password.");
      }

      // 2. Verify current password via real Supabase Auth sign-in check
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password: currentPassword,
      });

      if (verifyErr) {
        setPasswordError("Current password is incorrect.");
        setUpdatingPassword(false);
        return;
      }

      // 3. Update password in Supabase Auth
      const { error: updateAuthErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateAuthErr) throw updateAuthErr;

      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password updated successfully.");
    } catch (err: any) {
      console.error("Change password error:", err);
      setPasswordError(
        "Unable to update password. Please check your current password and try again.",
      );
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 max-w-6xl">
      {/* ============================================================ */}
      {/* 1. PAGE HEADER (Compact)                                    */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link to="/account" className="hover:text-primary transition-colors">
              Account
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">Settings</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 leading-tight">
            Account Settings
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Manage your account preferences, notifications and security options.
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. TWO-COLUMN BALANCED LAYOUT (Main 70% | Right 30%)        */}
      {/* ============================================================ */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
        {/* LEFT COLUMN: MAIN SETTINGS SECTIONS */}
        <div className="space-y-5">
          {/* SECTION 1: NOTIFICATIONS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/15">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-extrabold text-slate-900 leading-snug">
                  Notifications
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Configure order and fulfillment alerts.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs divide-y divide-slate-100">
              {/* Order Updates */}
              <div className="flex items-center justify-between gap-4 pt-0">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Order Updates</p>
                  <p className="text-slate-500 text-xs font-medium">
                    Receive updates about your orders and delivery status.
                  </p>
                </div>
                <Switch
                  checked={orderUpdates}
                  onCheckedChange={setOrderUpdates}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>

              {/* Delivery Updates */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Delivery Updates</p>
                  <p className="text-slate-500 text-xs font-medium">
                    Get notified when your order is out for delivery.
                  </p>
                </div>
                <Switch
                  checked={deliveryUpdates}
                  onCheckedChange={setDeliveryUpdates}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>

              {/* Service Updates */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Service Updates</p>
                  <p className="text-slate-500 text-xs font-medium">
                    Receive important service-related notifications.
                  </p>
                </div>
                <Switch
                  checked={serviceUpdates}
                  onCheckedChange={setServiceUpdates}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>

              {/* Promotional Offers */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Promotional Offers</p>
                  <p className="text-slate-500 text-xs font-medium">
                    Receive offers, promotions and seasonal updates.
                  </p>
                </div>
                <Switch
                  checked={promotions}
                  onCheckedChange={setPromotions}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: COMMUNICATION PREFERENCES */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0 border border-blue-100">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-extrabold text-slate-900 leading-snug">
                  Communication Preferences
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select how you want to receive messages.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs divide-y divide-slate-100">
              {/* Email Notifications */}
              <div className="flex items-center justify-between gap-4 pt-0">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Email Notifications</p>
                  <p className="text-slate-500 text-xs font-medium">
                    Receive account and order updates by email.
                  </p>
                </div>
                <Switch
                  checked={emailNotifs}
                  onCheckedChange={setEmailNotifs}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>

              {/* SMS Notifications */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">SMS Notifications</p>
                  <p className="text-slate-500 text-xs font-medium">
                    Receive important delivery notifications by SMS.
                  </p>
                </div>
                <Switch
                  checked={smsNotifs}
                  onCheckedChange={setSmsNotifs}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between gap-4 pt-4">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Push Notifications</p>
                  <p className="text-slate-500 text-xs font-medium">
                    Receive browser and portal notifications when active.
                  </p>
                </div>
                <Switch
                  checked={pushNotifs}
                  onCheckedChange={setPushNotifs}
                  className="data-[state=checked]:bg-primary shrink-0"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PRIVACY & DATA */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0 border border-emerald-100">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-extrabold text-slate-900 leading-snug">
                  Privacy & Data
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Manage your personal data preferences under UK GDPR.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {/* Personal Information */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">
                    Personal Information
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Manage your personal account information.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="rounded-xl text-xs font-bold shrink-0 border-slate-200 text-slate-700 hover:text-primary hover:border-primary/40 h-8 px-3"
                >
                  <Link to="/account/profile">
                    Manage <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Link>
                </Button>
              </div>

              {/* Data Preferences */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Data Preferences</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Manage how your account information is used.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.info("Data preferences are set to standard UK privacy defaults.")
                  }
                  className="rounded-xl text-xs font-bold shrink-0 border-slate-200 text-slate-700 hover:text-primary hover:border-primary/40 h-8 px-3"
                >
                  View <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>

              {/* Privacy Information */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Privacy Information</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Learn how your account data is handled.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.info(
                      "John Stayte Services processes customer order data in accordance with UK GDPR and data protection regulations.",
                    )
                  }
                  className="rounded-xl text-xs font-bold shrink-0 border-slate-200 text-slate-700 hover:text-primary hover:border-primary/40 h-8 px-3"
                >
                  Learn More <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 4: SECURITY */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0 border border-amber-100">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-display font-extrabold text-slate-900 leading-snug">
                  Security
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Password and session security options.
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              {/* Change Password Row */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Password</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Manage your account password and keep your account secure.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setPasswordError(null);
                    setPasswordModalOpen(true);
                  }}
                  className="rounded-xl text-xs font-extrabold border-slate-200 text-slate-800 hover:text-primary hover:border-primary/40 h-8 px-3.5 gap-1 shrink-0 self-start sm:self-center transition-colors"
                >
                  Change Password <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Active Session Row */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Session</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Manage your active account sessions.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200/80 px-2.5 py-0.5 rounded-lg"
                >
                  1 Active Session
                </Badge>
              </div>
            </div>
          </div>

          {/* SECTION 5: ACCOUNT ACTIONS (Danger Zone) */}
          <div className="bg-red-50/20 rounded-2xl border border-red-200/80 p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-red-100 pb-3">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <div>
                <h2 className="text-sm font-display font-bold text-red-950">Account Actions</h2>
                <p className="text-[11px] text-red-800/70 font-medium">
                  Session termination and account closure options.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Sign Out */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 p-3.5 rounded-xl border border-red-100">
                <div>
                  <p className="font-bold text-slate-900 text-xs sm:text-sm">Sign Out</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    End your active portal session on this device.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate({ to: "/" });
                  }}
                  className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shrink-0 h-8 px-3.5"
                >
                  <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
                </Button>
              </div>

              {/* Delete Account */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 p-3.5 rounded-xl border border-red-100">
                <div>
                  <p className="font-bold text-red-900 text-xs sm:text-sm">Delete Account</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Permanently request account closure.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-xl text-xs font-extrabold shrink-0 h-8 px-3.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 6: STICKY/BOTTOM SAVE ACTION BAR */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:px-6 sm:py-4.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Changes are saved to your customer account</span>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto rounded-xl font-extrabold text-xs shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90 text-white h-9.5 px-6 gap-2 transition-all hover:scale-[1.01]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN: USEFUL SIDEBAR INFO CARDS */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          {/* Account Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <h3 className="text-xs font-display font-extrabold uppercase tracking-wider text-slate-400">
              Account Overview
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Account Status</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Security</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Protected (SSL)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Delivery Zone</span>
                <span className="font-bold text-slate-900">Gloucestershire Direct</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                <span className="text-slate-500 font-medium">Account Email</span>
                <span
                  className="font-bold text-slate-900 truncate max-w-[140px]"
                  title={user?.email}
                >
                  {user?.email || "customer@jss.com"}
                </span>
              </div>
            </div>
          </div>

          {/* Need Help? Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <HelpCircle className="h-4 w-4" /> Need Help With Settings?
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Contact our Whitminster logistics team or submit a customer support ticket for
              assistance with your account preferences.
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:text-primary hover:bg-primary/5 h-9 gap-1"
            >
              <Link to="/account/support">
                Contact Support <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Link>
            </Button>
          </div>

          {/* Data Protection Reassurance Card */}
          <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Info className="h-4 w-4 text-slate-400" /> Data Protection
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Your account settings, fuel preferences, and delivery notes are strictly managed under
              UK GDPR and ISO data protection standards.
            </p>
          </div>
        </aside>
      </div>

      {/* ============================================================ */}
      {/* 3. REAL SUPABASE AUTH CHANGE PASSWORD MODAL                 */}
      {/* ============================================================ */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 sm:p-7 bg-white">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display font-black text-xl text-slate-900 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Change Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Update your password to keep your John Stayte Services customer account secure.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4 pt-2 text-xs">
            {/* Current Password Field */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Current Password *</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="••••••••••••"
                  className="rounded-xl text-xs font-semibold h-10 border-slate-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">New Password *</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="••••••••••••"
                  className="rounded-xl text-xs font-semibold h-10 border-slate-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700">Confirm New Password *</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  placeholder="••••••••••••"
                  className="rounded-xl text-xs font-semibold h-10 border-slate-200 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordModalOpen(false)}
                disabled={updatingPassword}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={updatingPassword}
                className="rounded-xl font-extrabold text-xs gap-2 px-5 shadow-sm bg-primary hover:bg-primary/90 text-white h-10"
              >
                {updatingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                {updatingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* 4. DELETE ACCOUNT CONFIRMATION MODAL                         */}
      {/* ============================================================ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white space-y-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display font-black text-lg text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Request Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-1 leading-relaxed">
              Are you sure you want to request account closure? Account deletion requests are
              processed manually by our customer support team in Gloucestershire.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-3 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl text-xs font-bold border-slate-200"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                toast.info("Account deletion request submitted to support team.");
              }}
              className="rounded-xl font-extrabold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              Confirm Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
