import { useState } from "react";
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
  const { logout } = useStore();
  const navigate = useNavigate();

  // Local UI toggle states
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [deliveryUpdates, setDeliveryUpdates] = useState(true);
  const [serviceUpdates, setServiceUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleSave = () => {
    toast.success("Settings saved");
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
      setPasswordError("Unable to update password. Please check your current password and try again.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
          <span>/</span>
          <span className="text-foreground">Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your account preferences, notifications and account options.
        </p>
      </div>

      {/* Two Column Layout Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
        {/* Left Column: Main Settings Forms */}
        <div className="space-y-6">
          {/* SECTION 1: NOTIFICATIONS */}
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-5">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Notifications</h2>
                <p className="text-[11px] text-muted-foreground">Configure order and fulfillment alerts.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs divide-y">
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5 max-w-md pr-4">
                  <p className="font-bold text-foreground">Order Updates</p>
                  <p className="text-muted-foreground text-[11px]">Receive updates about your orders and delivery status.</p>
                </div>
                <Switch checked={orderUpdates} onCheckedChange={setOrderUpdates} />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5 max-w-md pr-4">
                  <p className="font-bold text-foreground">Delivery Updates</p>
                  <p className="text-muted-foreground text-[11px]">Get notified when your order is out for delivery.</p>
                </div>
                <Switch checked={deliveryUpdates} onCheckedChange={setDeliveryUpdates} />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5 max-w-md pr-4">
                  <p className="font-bold text-foreground">Service Updates</p>
                  <p className="text-muted-foreground text-[11px]">Receive important service-related notifications.</p>
                </div>
                <Switch checked={serviceUpdates} onCheckedChange={setServiceUpdates} />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5 max-w-md pr-4">
                  <p className="font-bold text-foreground">Promotional Offers</p>
                  <p className="text-muted-foreground text-[11px]">Receive offers, promotions and seasonal updates.</p>
                </div>
                <Switch checked={promotions} onCheckedChange={setPromotions} />
              </div>
            </div>
          </div>

          {/* SECTION 2: COMMUNICATION PREFERENCES */}
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-5">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Communication Preferences</h2>
                <p className="text-[11px] text-muted-foreground">Select how you want to receive messages.</p>
              </div>
            </div>

            <div className="space-y-4 text-xs divide-y">
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5 max-w-md pr-4">
                  <p className="font-bold text-foreground">Email Notifications</p>
                  <p className="text-muted-foreground text-[11px]">Receive account and order updates by email.</p>
                </div>
                <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5 max-w-md pr-4">
                  <p className="font-bold text-foreground">SMS Notifications</p>
                  <p className="text-muted-foreground text-[11px]">Receive important delivery notifications by SMS.</p>
                </div>
                <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-0.5 max-w-md pr-4">
                  <p className="font-bold text-foreground">Push Notifications</p>
                  <p className="text-muted-foreground text-[11px]">Receive notifications when available.</p>
                </div>
                <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
              </div>
            </div>
          </div>

          {/* SECTION 3: PRIVACY & DATA */}
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-5">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Privacy & Data</h2>
                <p className="text-[11px] text-muted-foreground">Manage your personal data preferences.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl border bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">Personal Information</p>
                  <p className="text-[11px] text-muted-foreground">Manage your personal account information.</p>
                </div>
                <Button size="sm" variant="outline" asChild className="rounded-full text-xs font-bold shrink-0">
                  <Link to="/account/profile">Manage &rarr;</Link>
                </Button>
              </div>

              <div className="p-3.5 rounded-2xl border bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">Data Preferences</p>
                  <p className="text-[11px] text-muted-foreground">Manage how your account information is used.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.info("Data preferences are set to standard UK privacy defaults.")} className="rounded-full text-xs font-bold shrink-0">
                  View
                </Button>
              </div>

              <div className="p-3.5 rounded-2xl border bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">Privacy Information</p>
                  <p className="text-[11px] text-muted-foreground">Learn how your account data is handled.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.info("JSS processes customer order data in accordance with UK GDPR.")} className="rounded-full text-xs font-bold shrink-0">
                  Learn More
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 4: ACCOUNT QUICK LINKS */}
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-5">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Account</h2>
                <p className="text-[11px] text-muted-foreground">Quick access to account sections.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-xs">
              <Link to="/account/profile" className="p-3.5 rounded-2xl border bg-slate-50/50 hover:bg-slate-100/80 transition-colors flex items-center justify-between group font-bold text-foreground">
                <span>View Profile</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
              <Link to="/account/addresses" className="p-3.5 rounded-2xl border bg-slate-50/50 hover:bg-slate-100/80 transition-colors flex items-center justify-between group font-bold text-foreground">
                <span>Manage Addresses</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
              <Link to="/account/notifications" className="p-3.5 rounded-2xl border bg-slate-50/50 hover:bg-slate-100/80 transition-colors flex items-center justify-between group font-bold text-foreground">
                <span>View Notifications</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            </div>
          </div>

          {/* SECTION 5: SECURITY (REAL BACKEND PASSWORD MANAGEMENT) */}
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-5">
            <div className="flex items-center gap-2.5 border-b pb-4">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Key className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Security</h2>
                <p className="text-[11px] text-muted-foreground">Password and session security options.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Real Password Management Row */}
              <div className="p-3.5 rounded-2xl border bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">Password</p>
                  <p className="text-[11px] text-muted-foreground">Manage your account password and keep your account secure.</p>
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
                  className="rounded-full text-xs font-extrabold border-slate-300 hover:bg-white text-foreground hover:text-primary gap-1 shrink-0 self-start sm:self-center"
                >
                  Change Password <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Active Session Row */}
              <div className="p-3.5 rounded-2xl border bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">Session</p>
                  <p className="text-[11px] text-muted-foreground">Manage your active account sessions.</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                  1 Active Session
                </Badge>
              </div>
            </div>
          </div>

          {/* SECTION 6: ACCOUNT ACTIONS (DANGER ZONE) */}
          <div className="surface-card p-6 rounded-3xl border border-red-200 bg-red-50/10 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-red-100 pb-3">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-bold text-red-950">Account Actions</h2>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-foreground">Sign Out of Session</p>
                <p className="text-[11px] text-muted-foreground">End your active portal session on this device.</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  navigate({ to: "/" });
                }}
                className="rounded-full text-xs font-bold border-slate-300 hover:bg-slate-100"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out
              </Button>
            </div>

            <div className="pt-3 border-t border-red-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-red-900">Delete Account</p>
                <p className="text-[11px] text-muted-foreground">Permanently request account closure.</p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="rounded-full text-xs font-bold"
              >
                Delete Account
              </Button>
            </div>
          </div>

          {/* SAVE BUTTON BAR */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} size="lg" className="rounded-full font-black text-xs shadow-md gap-2 px-6">
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        </div>

        {/* Right Column: Help & Support Sidebar Panel */}
        <div className="space-y-6">
          <div className="surface-card p-6 rounded-3xl border bg-white space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <HelpCircle className="h-4 w-4" /> Need Help With Settings?
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Contact our Whitminster depot team or submit a customer enquiry for assistance with your account preferences.
            </p>
            <Button asChild variant="outline" className="w-full rounded-full text-xs font-bold gap-1.5">
              <Link to="/account/support">Contact Support &rarr;</Link>
            </Button>
          </div>

          <div className="surface-card p-6 rounded-3xl border bg-slate-50/70 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Info className="h-4 w-4 text-muted-foreground" /> Data Protection
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Your account settings and order preferences are strictly managed under UK data privacy regulations.
            </p>
          </div>
        </div>
      </div>

      {/* REAL SUPABASE AUTH CHANGE PASSWORD MODAL */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Change Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Update your password to keep your account secure.
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
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
            <div className="pt-3 flex items-center justify-end gap-2 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordModalOpen(false)}
                disabled={updatingPassword}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={updatingPassword}
                className="rounded-full font-extrabold text-xs gap-2 px-6 shadow-md bg-primary hover:bg-primary/90 text-white"
              >
                {updatingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {updatingPassword ? "Updating Password..." : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" /> Request Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-2 leading-relaxed">
              Are you sure you want to request account closure? Account deletion requests are processed manually by our customer support team. No data has been modified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="rounded-full text-xs font-bold">
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => { setDeleteDialogOpen(false); toast.info("Account deletion request submitted to support team."); }} className="rounded-full text-xs font-bold">
              Confirm Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
