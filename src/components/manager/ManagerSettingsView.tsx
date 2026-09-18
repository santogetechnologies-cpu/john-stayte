import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Bell,
  Building2,
  ShieldCheck,
  Save,
  Key,
  LogOut,
  CheckCircle2,
  Sun,
  Moon,
  Laptop,
  Globe,
  Loader2,
  Lock,
  Smartphone,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ManagerSettingsView() {
  const { user, logout } = useStore();
  const [activeTab, setActiveTab] = useState<"account" | "preferences" | "operations" | "security">(
    "account",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("Operations Manager");

  // Notifications State
  const [notifOrders, setNotifOrders] = useState(true);
  const [notifApprovals, setNotifApprovals] = useState(true);
  const [notifDeliveries, setNotifDeliveries] = useState(true);
  const [notifInventory, setNotifInventory] = useState(true);
  const [notifEnquiries, setNotifEnquiries] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);

  // Appearance State
  const [theme, setTheme] = useState<"light" | "system" | "dark">("light");

  // Operations State
  const [defaultDepot, setDefaultDepot] = useState("Fromebridge Main Station");
  const [deliveryArea, setDeliveryArea] = useState("Gloucester, Stroud & Frampton");
  const [timeSlot, setTimeSlot] = useState("Morning (07:30 - 12:00)");
  const [approvalPref, setApprovalPref] = useState("manual");

  // Password Modal State
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch real authenticated profile from Supabase
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user) {
          setEmail(authUser.user.email || user?.email || "");

          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.user.id)
            .single();

          if (profile) {
            setFullName(
              profile.full_name || authUser.user.user_metadata?.full_name || user?.name || "",
            );
            setPhone(profile.phone || "07700 900123");
          } else {
            setFullName(user?.name || "");
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("No active session");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.user.id);

      if (error) throw error;
      toast.success("Settings saved successfully");
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Password Change via Supabase Auth
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long.");
    }
    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password changed successfully");
      setPasswordModal(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error("Failed to change password: " + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle Sign Out of All Sessions
  const handleSignOutAll = async () => {
    if (!confirm("Are you sure you want to sign out of all active sessions?")) return;
    try {
      await supabase.auth.signOut();
      logout();
      toast.success("Signed out of all sessions");
      window.location.href = "/login";
    } catch (err: any) {
      toast.error("Failed to sign out: " + err.message);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* 1. PAGE HEADER */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-1">
          <Link to="/manager" className="hover:text-red-600 transition-colors">
            Manager
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-red-500/10 text-red-600 border border-red-500/20">
            <Building2 className="h-6 w-6" />
          </div>
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Manage your manager account, preferences and operational settings.
        </p>
      </div>

      {/* 2. TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] items-start">
        {/* LEFT COLUMN: SETTINGS SIDEBAR TABS */}
        <div className="surface-card p-2 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
          {[
            {
              id: "account",
              label: "Account",
              desc: "Personal details & profile",
              icon: User,
            },
            {
              id: "preferences",
              label: "Preferences",
              desc: "Notifications & theme",
              icon: Bell,
            },
            {
              id: "operations",
              label: "Operations",
              desc: "Depot defaults & dispatch",
              icon: Building2,
            },
            {
              id: "security",
              label: "Security",
              desc: "Password & login security",
              icon: ShieldCheck,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 relative ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/25 font-black"
                    : "text-slate-700 hover:bg-slate-100/60 font-semibold"
                }`}
              >
                <div
                  className={`p-2 rounded-xl border shrink-0 ${
                    isActive
                      ? "bg-white/20 border-white/30 text-white"
                      : "bg-slate-50 border-slate-200/60 text-slate-600"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{tab.label}</p>
                  <p
                    className={`text-[10px] truncate ${
                      isActive ? "text-white/80 font-medium" : "text-slate-400"
                    }`}
                  >
                    {tab.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* RIGHT COLUMN: CONTENT PANEL */}
        <div className="space-y-6">
          {loading ? (
            <div className="surface-card p-12 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl text-center space-y-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              <Loader2 className="mx-auto h-6 w-6 text-red-600 animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading profile settings...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: ACCOUNT SETTINGS */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  {/* Profile Card Overview */}
                  <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/80 pb-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-red-500/40 shadow-md">
                          <AvatarFallback className="bg-gradient-to-tr from-red-600 to-rose-500 text-white font-black text-xl">
                            {(fullName || "M").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-base font-black text-slate-900">
                            {fullName || "Manager Account"}
                          </h2>
                          <p className="text-xs text-slate-500 font-semibold">
                            {email || "manager@jss.com"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-200/80 shadow-2xs text-[10px] font-extrabold px-2.5 py-0.5 rounded-full"
                            >
                              Operations Manager
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200/80 shadow-2xs text-[10px] font-extrabold px-2.5 py-0.5 rounded-full"
                            >
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700">Full Name</label>
                          <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Dave Miller"
                            className="mt-1 rounded-xl text-xs font-semibold bg-slate-50/80 border-slate-200/80 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700">
                            Email Address (Supabase Auth)
                          </label>
                          <Input
                            value={email}
                            disabled
                            className="mt-1 rounded-xl text-xs font-semibold bg-slate-100/60 border-slate-200/60 cursor-not-allowed text-slate-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700">Phone Number</label>
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="07700 900123"
                            className="mt-1 rounded-xl text-xs font-semibold bg-slate-50/80 border-slate-200/80 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700">Job Title</label>
                          <Input
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="Operations Manager"
                            className="mt-1 rounded-xl text-xs font-semibold bg-slate-50/80 border-slate-200/80 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100/80 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => window.location.reload()}
                          className="rounded-full text-xs font-bold text-slate-500 hover:text-slate-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={saving}
                          className="rounded-full font-black text-xs gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/25"
                        >
                          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 2: PREFERENCES (NOTIFICATIONS & APPEARANCE) */}
              {activeTab === "preferences" && (
                <div className="space-y-6">
                  {/* Notification Preferences */}
                  <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Notification Controls
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Choose which operational events trigger alerts in your dashboard.
                      </p>
                    </div>

                    <div className="space-y-4 text-xs divide-y divide-slate-100/80">
                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">New Order Alerts</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Notify when a new customer order is placed.
                          </p>
                        </div>
                        <Switch checked={notifOrders} onCheckedChange={setNotifOrders} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">Order Approval Requests</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Notify when high-value orders require manager review.
                          </p>
                        </div>
                        <Switch checked={notifApprovals} onCheckedChange={setNotifApprovals} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">Delivery Delays</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Notify when a driver logs a route delay.
                          </p>
                        </div>
                        <Switch checked={notifDeliveries} onCheckedChange={setNotifDeliveries} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">Low Stock Threshold Alerts</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Notify when inventory drops below reorder points.
                          </p>
                        </div>
                        <Switch checked={notifInventory} onCheckedChange={setNotifInventory} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">Customer Support Messages</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Notify when a new customer support ticket is opened.
                          </p>
                        </div>
                        <Switch checked={notifEnquiries} onCheckedChange={setNotifEnquiries} />
                      </div>
                    </div>
                  </div>

                  {/* Appearance Theme Options */}
                  <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300">
                    <div>
                      <h2 className="text-base font-black text-slate-900">Appearance</h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Customize the visual theme for your manager workspace.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "light", label: "Light", icon: Sun },
                        { id: "system", label: "System", icon: Laptop },
                        { id: "dark", label: "Dark", icon: Moon },
                      ].map((item) => {
                        const isSelected = theme === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setTheme(item.id as any)}
                            className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${
                              isSelected
                                ? "border-red-500/50 bg-red-50/50 font-black text-red-600 shadow-2xs"
                                : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 font-bold"
                            }`}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="text-xs">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: OPERATIONS SETTINGS */}
              {activeTab === "operations" && (
                <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Operational Depot Preferences
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Configure default depot dispatch parameters and order management rules.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-slate-700">
                        Default Depot Station
                      </label>
                      <Select value={defaultDepot} onValueChange={setDefaultDepot}>
                        <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200/80 bg-white/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border-white/80 shadow-xl">
                          <SelectItem value="Fromebridge Main Station">
                            Fromebridge Main Station (A38 Whitminster)
                          </SelectItem>
                          <SelectItem value="Gloucester Central Depot">
                            Gloucester Central Depot
                          </SelectItem>
                          <SelectItem value="Stroud Service Depot">Stroud Service Depot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">
                        Primary Delivery Region
                      </label>
                      <Select value={deliveryArea} onValueChange={setDeliveryArea}>
                        <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200/80 bg-white/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border-white/80 shadow-xl">
                          <SelectItem value="Gloucester, Stroud & Frampton">
                            Gloucester, Stroud & Frampton
                          </SelectItem>
                          <SelectItem value="Cotswolds & Cheltenham">
                            Cotswolds & Cheltenham Region
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700">
                        Default Dispatch Slot
                      </label>
                      <Select value={timeSlot} onValueChange={setTimeSlot}>
                        <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold h-10 border-slate-200/80 bg-white/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-xl border-white/80 shadow-xl">
                          <SelectItem value="Morning (07:30 - 12:00)">
                            Morning (07:30 - 12:00)
                          </SelectItem>
                          <SelectItem value="Afternoon (12:00 - 17:00)">
                            Afternoon (12:00 - 17:00)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={() => toast.success("Operational preferences updated")}
                        className="rounded-full font-black text-xs gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/25"
                      >
                        <Save className="h-4 w-4" /> Save Operational Defaults
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SECURITY & DANGER ZONE */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  {/* Security Overview */}
                  <div className="surface-card p-6 rounded-[26px] border border-white/80 bg-white/70 backdrop-blur-xl space-y-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(225,29,72,0.12)] hover:border-red-500/40 transition-all duration-300">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        Password & Authentication
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Manage your account credentials through Supabase Auth.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">Account Password</p>
                        <p className="text-slate-500 text-[11px] font-medium">
                          Secure password authentication enabled.
                        </p>
                      </div>
                      <Button
                        onClick={() => setPasswordModal(true)}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs font-black gap-1.5 border-white/80 bg-white/80 backdrop-blur-md text-slate-700 hover:bg-white hover:text-red-600 shadow-2xs transition-all"
                      >
                        <Key className="h-3.5 w-3.5" /> Change Password
                      </Button>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <p className="font-bold text-slate-900">Active Session</p>
                      </div>
                      <p className="text-slate-500 text-[11px] font-medium">
                        Current session authenticated via Supabase Auth JWT token.
                      </p>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="surface-card p-6 rounded-[26px] border border-rose-200/80 bg-rose-50/30 backdrop-blur-xl space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 text-rose-700">
                      <ShieldAlert className="h-5 w-5" />
                      <h2 className="text-base font-black">Account Security Actions</h2>
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                      Sign out of all active browser sessions across devices.
                    </p>

                    <Button
                      onClick={handleSignOutAll}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-black text-rose-700 border-rose-200/80 bg-white hover:bg-rose-50 shadow-2xs"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-1" /> Sign Out of All Sessions
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CHANGE PASSWORD DIALOG */}
      <Dialog open={passwordModal} onOpenChange={setPasswordModal}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white/95 backdrop-blur-2xl border border-white/80 shadow-2xl text-slate-900">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-slate-900">Change Password</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-bold text-slate-700">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 rounded-xl text-xs font-semibold bg-slate-50/80 border-slate-200/80 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordModal(false)}
                className="rounded-full text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changingPassword}
                className="rounded-full font-black text-xs gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md shadow-red-600/25"
              >
                <Key className="h-4 w-4" />
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
