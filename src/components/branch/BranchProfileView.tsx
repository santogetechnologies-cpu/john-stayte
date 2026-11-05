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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/60 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              My Staff Profile
            </h1>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] font-extrabold text-[10px] uppercase tracking-wider shadow-2xs">
              Staff Account
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Branch staff credentials, operational permissions, and assigned forecourt location.
          </p>
        </div>
      </div>

      {/* STAFF PROFILE & ASSIGNED LOCATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Details Card */}
        <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#F3F4F6] text-[#374151] flex items-center justify-center border border-[#E5E7EB] shadow-2xs">
              <User className="h-4 w-4" />
            </div>
            <span>Account Details</span>
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Full Name</Label>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">{user?.name || "Branch Staff"}</p>
            </div>
            <div>
              <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Email Address</Label>
              <p className="font-mono font-bold text-slate-800 mt-0.5">{user?.email}</p>
            </div>
            <div>
              <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">System Role</Label>
              <p className="mt-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] font-black text-[10px] uppercase tracking-wider shadow-2xs">
                  BRANCH_STAFF
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Branch Location Card */}
        <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-[#F3F4F6] text-[#374151] flex items-center justify-center border border-[#E5E7EB] shadow-2xs">
              <Building2 className="h-4 w-4" />
            </div>
            <span>Assigned Operational Branch</span>
          </h2>

          <div className="space-y-3.5 text-xs">
            <div>
              <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Branch Name</Label>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">{branchName}</p>
            </div>
            <div>
              <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Branch Address</Label>
              <p className="text-slate-700 font-medium mt-0.5 leading-relaxed">
                {branchInfo ? `${branchInfo.address}, ${branchInfo.town} ${branchInfo.postcode}` : "Assignment Pending Confirmation"}
              </p>
            </div>
            {branchInfo?.telephone && (
              <div>
                <Label className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider">Branch Contact</Label>
                <p className="font-semibold text-slate-800 mt-0.5">{branchInfo.telephone}</p>
              </div>
            )}
            <div className="p-3.5 bg-[#F3F4F6]/80 rounded-2xl border border-[#E5E7EB] text-[#374151] text-[11px] leading-relaxed">
              🔒 Branch assignment is managed centrally by Operations Managers and cannot be altered by branch staff.
            </div>
          </div>
        </div>
      </div>

      {/* SECURITY / UPDATE PASSWORD */}
      <div className="surface-card rounded-[24px] border border-white/80 bg-white/70 backdrop-blur-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] space-y-4 max-w-md">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-[#F3F4F6] text-[#374151] flex items-center justify-center border border-[#E5E7EB] shadow-2xs">
            <Lock className="h-4 w-4" />
          </div>
          <span>Security &amp; Password</span>
        </h2>

        <form onSubmit={handleUpdatePassword} className="space-y-3.5">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">New Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9.5 rounded-xl text-xs bg-white/80 border-slate-200"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700">Confirm New Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9.5 rounded-xl text-xs bg-white/80 border-slate-200"
            />
          </div>
          <Button
            type="submit"
            disabled={savingPassword}
            size="sm"
            className="h-9.5 rounded-full font-black text-xs bg-[#374151] hover:bg-[#1f2937] text-white gap-1.5 shadow-sm px-4 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingPassword ? "Updating..." : "Update Password"}</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

