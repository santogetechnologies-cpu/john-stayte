import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { User, ChevronRight, ShieldCheck, MapPin, Building2, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { resolveBranchInfo } from "@/lib/branch-service";
import { toast } from "sonner";

export function BranchProfileView() {
  const { user } = useStore();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const branchName = user?.assignedBranch || "Pending Confirmation";
  const branchInfo = resolveBranchInfo(user?.assignedBranch, user?.assignedBranchId);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* BREADCRUMB */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/branch" className="hover:text-slate-700 transition-colors">
          Branch
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-semibold text-slate-800">Branch Staff Profile</span>
      </div>

      {/* HEADER */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-slate-900">
            My Staff Profile
          </h1>
          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-xs">
            Staff Account
          </Badge>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Branch staff credentials, operational permissions, and assigned forecourt location.
        </p>
      </div>

      {/* STAFF PROFILE & ASSIGNED LOCATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <User className="h-4 w-4 text-amber-600" />
            <span>Account Details</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-slate-400 font-bold">Full Name</Label>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{user?.name || "Branch Staff"}</p>
            </div>
            <div>
              <Label className="text-slate-400 font-bold">Email Address</Label>
              <p className="font-mono text-slate-800 mt-0.5">{user?.email}</p>
            </div>
            <div>
              <Label className="text-slate-400 font-bold">System Role</Label>
              <p className="mt-0.5">
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-extrabold text-[10px]">
                  BRANCH_STAFF
                </Badge>
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Branch Location Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            <span>Assigned Operational Branch</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-slate-400 font-bold">Branch Name</Label>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{branchName}</p>
            </div>
            <div>
              <Label className="text-slate-400 font-bold">Branch Address</Label>
              <p className="text-slate-700 mt-0.5">
                {branchInfo ? `${branchInfo.address}, ${branchInfo.town} ${branchInfo.postcode}` : "Assignment Pending Confirmation"}
              </p>
            </div>
            {branchInfo?.telephone && (
              <div>
                <Label className="text-slate-400 font-bold">Branch Contact</Label>
                <p className="font-semibold text-slate-800 mt-0.5">{branchInfo.telephone}</p>
              </div>
            )}
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-amber-900 text-[11px]">
              🔒 Branch assignment is managed centrally by Operations Managers and cannot be altered by branch staff.
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY / UPDATE PASSWORD */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 max-w-md">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600" />
          <span>Security &amp; Password</span>
        </h2>

        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">New Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 rounded-xl text-xs"
            />
          </div>
          <Button
            type="submit"
            disabled={savingPassword}
            size="sm"
            className="rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingPassword ? "Updating..." : "Update Password"}</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

