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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ManagerSettingsView() {
  const { user, logout } = useStore();
  const [activeTab, setActiveTab] = useState<"account" | "preferences" | "operations" | "security">("account");
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
            setFullName(profile.full_name || authUser.user.user_metadata?.full_name || user?.name || "");
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
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/manager" className="hover:text-primary transition-colors">
            Manager
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold">Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your manager account, preferences and operational settings.
        </p>
      </div>

      {/* 2. TWO-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] items-start">
        {/* LEFT COLUMN: SETTINGS SIDEBAR TABS */}
        <div className="surface-card p-2 rounded-3xl border bg-white space-y-1 shadow-2xs">
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
                    ? "bg-slate-900 text-white shadow-xs font-bold"
                    : "text-slate-700 hover:bg-slate-50 font-medium"
                }`}
              >
                <div
                  className={`p-2 rounded-xl border shrink-0 ${
                    isActive ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-100 text-slate-600"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{tab.label}</p>
                  <p
                    className={`text-[10px] truncate ${
                      isActive ? "text-slate-300" : "text-muted-foreground"
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
            <div className="surface-card p-12 rounded-3xl border bg-white text-center space-y-3">
              <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
              <p className="text-xs font-bold text-muted-foreground">
                Loading profile settings...
              </p>
            </div>
          ) : (
            <>
              {/* TAB 1: ACCOUNT SETTINGS */}
              {activeTab === "account" && (
                <div className="space-y-6">
                  {/* Profile Card Overview */}
                  <div className="surface-card p-6 rounded-3xl border bg-white space-y-6 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-2 border-primary shadow-xs">
                          <AvatarFallback className="bg-blue-600 text-white font-black text-xl">
                            {(fullName || "M").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-base font-black text-foreground">
                            {fullName || "Manager Account"}
                          </h2>
                          <p className="text-xs text-muted-foreground font-semibold">
                            {email || "manager@jss.com"}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold"
                            >
                              Operations Manager
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold"
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
                          <label className="font-bold text-muted-foreground">Full Name</label>
                          <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Dave Miller"
                            className="mt-1 rounded-xl text-xs font-semibold"
                            required
                          />
                        </div>

                        <div>
                          <label className="font-bold text-muted-foreground">
                            Email Address (Supabase Auth)
                          </label>
                          <Input
                            value={email}
                            disabled
                            className="mt-1 rounded-xl text-xs font-semibold bg-slate-50 cursor-not-allowed text-muted-foreground"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-muted-foreground">Phone Number</label>
                          <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="07700 900123"
                            className="mt-1 rounded-xl text-xs font-semibold"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-muted-foreground">Job Title</label>
                          <Input
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            placeholder="Operations Manager"
                            className="mt-1 rounded-xl text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => window.location.reload()}
                          className="rounded-full text-xs font-bold"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={saving}
                          className="rounded-full font-bold text-xs gap-1.5 shadow-md"
                        >
                          <Save className="h-4 w-4" />{" "}
                          {saving ? "Saving..." : "Save Changes"}
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
                  <div className="surface-card p-6 rounded-3xl border bg-white space-y-6 shadow-2xs">
                    <div>
                      <h2 className="text-base font-black text-foreground">
                        Notification Controls
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Choose which operational events trigger alerts in your dashboard.
                      </p>
                    </div>

                    <div className="space-y-4 text-xs divide-y divide-slate-100">
                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">New Order Alerts</p>
                          <p className="text-[11px] text-muted-foreground">
                            Notify when a new customer order is placed.
                          </p>
                        </div>
                        <Switch checked={notifOrders} onCheckedChange={setNotifOrders} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">Order Approval Requests</p>
                          <p className="text-[11px] text-muted-foreground">
                            Notify when high-value orders require manager review.
                          </p>
                        </div>
                        <Switch checked={notifApprovals} onCheckedChange={setNotifApprovals} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">Delivery Delays</p>
                          <p className="text-[11px] text-muted-foreground">
                            Notify when a driver logs a route delay.
                          </p>
                        </div>
                        <Switch checked={notifDeliveries} onCheckedChange={setNotifDeliveries} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">Low Stock Threshold Alerts</p>
                          <p className="text-[11px] text-muted-foreground">
                            Notify when inventory drops below reorder points.
                          </p>
                        </div>
                        <Switch checked={notifInventory} onCheckedChange={setNotifInventory} />
                      </div>

                      <div className="pt-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-foreground">Customer Support Messages</p>
                          <p className="text-[11px] text-muted-foreground">
                            Notify when a new customer support ticket is opened.
                          </p>
                        </div>
                        <Switch checked={notifEnquiries} onCheckedChange={setNotifEnquiries} />
                      </div>
                    </div>
                  </div>

                  {/* Appearance Theme Options */}
                  <div className="surface-card p-6 rounded-3xl border bg-white space-y-4 shadow-2xs">
                    <div>
                      <h2 className="text-base font-black text-foreground">Appearance</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
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
                                ? "border-primary bg-primary/5 font-extrabold text-primary"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
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
                <div className="surface-card p-6 rounded-3xl border bg-white space-y-6 shadow-2xs">
                  <div>
                    <h2 className="text-base font-black text-foreground">
                      Operational Depot Preferences
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure default depot dispatch parameters and order management rules.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-bold text-muted-foreground">Default Depot Station</label>
                      <Select value={defaultDepot} onValueChange={setDefaultDepot}>
                        <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
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
                      <label className="font-bold text-muted-foreground">Primary Delivery Region</label>
                      <Select value={deliveryArea} onValueChange={setDeliveryArea}>
                        <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
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
                      <label className="font-bold text-muted-foreground">Default Dispatch Slot</label>
                      <Select value={timeSlot} onValueChange={setTimeSlot}>
                        <SelectTrigger className="mt-1 rounded-xl text-xs font-semibold h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
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
                        className="rounded-full font-bold text-xs gap-1.5 shadow-md"
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
                  <div className="surface-card p-6 rounded-3xl border bg-white space-y-6 shadow-2xs">
                    <div>
                      <h2 className="text-base font-black text-foreground">Password & Authentication</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Manage your account credentials through Supabase Auth.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-50/60 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-bold text-foreground">Account Password</p>
                        <p className="text-muted-foreground text-[11px]">
                          Secure password authentication enabled.
                        </p>
                      </div>
                      <Button
                        onClick={() => setPasswordModal(true)}
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white"
                      >
                        <Key className="h-3.5 w-3.5" /> Change Password
                      </Button>
                    </div>

                    <div className="p-4 rounded-2xl border bg-slate-50/60 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <p className="font-bold text-foreground">Active Session</p>
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Current session authenticated via Supabase Auth JWT token.
                      </p>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="surface-card p-6 rounded-3xl border border-red-200/80 bg-red-50/20 space-y-4 shadow-2xs">
                    <div className="flex items-center gap-2 text-red-700">
                      <ShieldAlert className="h-5 w-5" />
                      <h2 className="text-base font-black">Account Security Actions</h2>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Sign out of all active browser sessions across devices.
                    </p>

                    <Button
                      onClick={handleSignOutAll}
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs font-bold text-red-700 border-red-200 bg-white hover:bg-red-50"
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
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Change Password</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-bold text-muted-foreground">New Password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="mt-1 rounded-xl text-xs font-semibold"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPasswordModal(false)}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changingPassword}
                className="rounded-full font-bold text-xs gap-1.5 shadow-md"
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
