import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  ShieldCheck,
  Key,
  Save,
  Loader2,
  Lock,
  Smartphone,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function ManagerProfileView() {
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Real Supabase Profile state
  const [userId, setUserId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("Operations Manager");
  const [department, setDepartment] = useState("Gloucestershire Regional Logistics");
  const [createdAt, setCreatedAt] = useState("");

  // Password Modal
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Load real authenticated profile from Supabase
  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user) {
        setUserId(authUser.user.id);
        setEmail(authUser.user.email || user?.email || "");
        setCreatedAt(
          authUser.user.created_at
            ? new Date(authUser.user.created_at).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })
            : "Active",
        );

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
      console.error("Failed to load manager profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Handle Profile Update to Supabase
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;
      toast.success("Profile updated successfully");
      await loadProfile();
    } catch (err: any) {
      toast.error("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully");
      setPasswordModal(false);
      setNewPassword("");
    } catch (err: any) {
      toast.error("Failed to change password: " + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* PAGE HEADER */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
          <Link to="/manager" className="hover:text-primary transition-colors">
            Manager
          </Link>
          <span>/</span>
          <span className="text-foreground font-bold">Profile</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          My Profile
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your personal information and manager account.
        </p>
      </div>

      {loading ? (
        <div className="surface-card p-12 rounded-3xl border bg-white text-center space-y-3">
          <Loader2 className="mx-auto h-6 w-6 text-primary animate-spin" />
          <p className="text-xs font-bold text-muted-foreground">Loading profile details...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* PROFILE HERO CARD */}
          <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary shadow-2xs">
                  <AvatarFallback className="bg-blue-600 text-white font-black text-xl">
                    {(fullName || "M").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-foreground">
                      {fullName || "Manager Account"}
                    </h2>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold"
                    >
                      Active
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    {email || "manager@jss.com"}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
                    <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Operations Manager
                    </span>
                    {createdAt && <span>Member since {createdAt}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PERSONAL INFORMATION FORM */}
          <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-2xs">
            <div>
              <h3 className="text-sm font-black text-foreground">Personal Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update your account contact details.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-muted-foreground">Email Address</label>
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
                  <label className="font-bold text-muted-foreground">Department</label>
                  <Input
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Depot Operations"
                    className="mt-1 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={loadProfile}
                  className="rounded-full text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full font-bold text-xs gap-1.5 shadow-md"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>

          {/* ACCOUNT INFORMATION & SECURITY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-black text-foreground">Account Details</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-muted-foreground font-bold uppercase text-[10px]">
                    Account User ID
                  </p>
                  <p className="font-mono text-[11px] text-foreground font-semibold mt-0.5 truncate">
                    {userId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground font-bold uppercase text-[10px]">
                    Database Role
                  </p>
                  <p className="font-semibold text-foreground mt-0.5">manager</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-bold uppercase text-[10px]">
                    Authentication Method
                  </p>
                  <p className="font-semibold text-foreground mt-0.5">Supabase Auth (JWT)</p>
                </div>
              </div>
            </div>

            <div className="surface-card p-6 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-2xs">
              <h3 className="text-sm font-black text-foreground">Account Security</h3>
              <p className="text-xs text-muted-foreground">
                Keep your manager account credentials protected.
              </p>

              <div className="pt-2 space-y-2">
                <Button
                  onClick={() => setPasswordModal(true)}
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full text-xs font-bold gap-1.5 border-slate-200 bg-white"
                >
                  <Key className="h-3.5 w-3.5" /> Change Password
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD CHANGE DIALOG */}
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
