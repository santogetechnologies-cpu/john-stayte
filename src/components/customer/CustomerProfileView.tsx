import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  User,
  Save,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Calendar,
  AlertCircle,
  RotateCcw,
  Camera,
  Trash2,
  Upload,
  KeyRound,
  BadgeCheck,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export function CustomerProfileView() {
  const { user } = useStore();
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const [status, setStatus] = useState("Active");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(true);
  const [rawPrefs, setRawPrefs] = useState<any>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile Form Validation Error States
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Upload Profile Photo Dialog States
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Remove Photo Confirmation Dialog States
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);

  // Change Password Dialog States
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load authenticated customer profile from Supabase
  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) {
        throw new Error("You must be logged in to view your profile.");
      }

      setEmail(authUser.user.email || "");
      setCreatedAt(authUser.user.created_at || null);
      setEmailVerified(Boolean(authUser.user.email_confirmed_at || authUser.user.confirmed_at));

      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.user.id)
        .single();

      if (profErr && profErr.code !== "PGRST116") {
        throw profErr;
      }

      if (profile) {
        setName(profile.full_name || "");
        setPhone(profile.phone || "");
        setRole(profile.role || "customer");
        setStatus(profile.status || "Active");

        const prefs =
          typeof profile.notification_prefs === "object" &&
          profile.notification_prefs !== null &&
          !Array.isArray(profile.notification_prefs)
            ? (profile.notification_prefs as Record<string, any>)
            : {};
        setRawPrefs(prefs);
        setAvatarUrl(prefs.avatar_url || null);
      }
    } catch (err: any) {
      console.error("Profile query error:", err);
      setError(err.message || "Failed to query customer profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // Compute Customer Initials
  const initials = useMemo(() => {
    if (!name.trim()) return "C";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }, [name]);

  // Handle Photo File Selection in Upload Dialog
  const handleModalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid image format. Please select a JPG, PNG, WebP, or GIF file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please choose a smaller photo.");
      return;
    }

    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  // Upload Selected Photo to Supabase Storage
  const handleExecutePhotoUpload = async () => {
    if (!selectedPhotoFile) {
      toast.error("Please select an image file first.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Authentication session expired.");

      const userId = authUser.user.id;
      const fileExt = selectedPhotoFile.name.split(".").pop();
      const storagePath = `avatars/${userId}/profile_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(storagePath, selectedPhotoFile, {
          upsert: true,
          contentType: selectedPhotoFile.type,
        });

      if (uploadErr) throw uploadErr;

      const { data: pubUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(uploadData.path);

      const publicAvatarUrl = pubUrlData.publicUrl;
      const updatedPrefs = { ...rawPrefs, avatar_url: publicAvatarUrl };

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          notification_prefs: updatedPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profErr) throw profErr;

      setAvatarUrl(publicAvatarUrl);
      setRawPrefs(updatedPrefs);
      setUploadModalOpen(false);
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(null);

      toast.success("Profile photo updated successfully.");
      window.dispatchEvent(new Event("user_profile_updated"));
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast.error("Unable to update profile photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Confirm and Remove Photo from Supabase Storage & Profiles DB
  const handleExecutePhotoRemove = async () => {
    setRemovingPhoto(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Authentication session expired.");

      const userId = authUser.user.id;
      const updatedPrefs = { ...rawPrefs };
      delete updatedPrefs.avatar_url;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          notification_prefs: updatedPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profErr) throw profErr;

      setAvatarUrl(null);
      setRawPrefs(updatedPrefs);
      setRemoveModalOpen(false);

      toast.success("Profile photo removed.");
      window.dispatchEvent(new Event("user_profile_updated"));
    } catch (err: any) {
      console.error("Photo removal error:", err);
      toast.error("Failed to remove profile photo: " + err.message);
    } finally {
      setRemovingPhoto(false);
    }
  };

  // Form Validation & Save Personal Information
  const validateForm = () => {
    let valid = true;
    setNameError(null);
    setPhoneError(null);

    if (!name.trim() || name.trim().length < 2) {
      setNameError("Full name must be at least 2 characters long.");
      valid = false;
    }

    if (phone.trim() && !/^[0-9+\s()-]{7,20}$/.test(phone.trim())) {
      setPhoneError("Please enter a valid contact phone number.");
      valid = false;
    }

    return valid;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Authentication session expired.");

      const cleanName = name.trim();
      const cleanPhone = phone.trim();

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          phone: cleanPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUser.user.id);

      if (updateErr) throw updateErr;

      if (user) {
        user.name = cleanName;
      }

      toast.success("Saved successfully");
      window.dispatchEvent(new Event("user_profile_updated"));
      await loadProfile();
    } catch (err: any) {
      console.error("Save profile error:", err);
      toast.error("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // REAL SUPABASE AUTH CHANGE PASSWORD HANDLER
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError("New password and confirmation password do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      // 1. Verify current password by attempting authentication check
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user?.email) throw new Error("Authentication session expired.");

      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: authUser.user.email,
        password: currentPassword,
      });

      if (verifyErr) {
        setPasswordError("Current password is incorrect.");
        setUpdatingPassword(false);
        return;
      }

      // 2. Update user password in Supabase Auth
      const { error: updateAuthErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateAuthErr) throw updateAuthErr;

      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password updated successfully!");
    } catch (err: any) {
      console.error("Change password error:", err);
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Profile</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <User className="h-7 w-7 text-primary" /> My Profile
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your personal information, profile photo and account security.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs font-bold text-muted-foreground shadow-xs flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 text-primary animate-spin" /> Querying profile details from Supabase...
        </div>
      ) : error ? (
        <div className="p-12 text-center space-y-3 surface-card rounded-3xl border bg-white shadow-xs">
          <AlertCircle className="mx-auto h-9 w-9 text-rose-500" />
          <h3 className="font-bold text-sm text-foreground">Profile Query Error</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error}</p>
          <Button onClick={loadProfile} size="sm" variant="outline" className="rounded-full text-xs font-bold gap-1.5 mt-2">
            <RotateCcw className="h-3.5 w-3.5" /> Retry Query
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. TWO-COLUMN DESKTOP GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* LEFT OVERVIEW CARD */}
            <div className="surface-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white flex flex-col items-center text-center space-y-5 shadow-xs">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-slate-100 shadow-md ring-2 ring-primary/20 transition-all group-hover:opacity-90">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary text-white font-black text-3xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Edit Photo Overlay Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhotoFile(null);
                    setPhotoPreviewUrl(avatarUrl);
                    setUploadModalOpen(true);
                  }}
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-white shadow-lg flex items-center justify-center border-2 border-white hover:scale-110 transition-all cursor-pointer"
                  title="Update Profile Photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1.5 w-full">
                <h2 className="font-black text-xl text-foreground truncate">{name || "Valued Customer"}</h2>
                <p className="text-xs text-muted-foreground font-medium truncate">{email}</p>
              </div>

              {/* Photo Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                <Button
                  onClick={() => {
                    setSelectedPhotoFile(null);
                    setPhotoPreviewUrl(avatarUrl);
                    setUploadModalOpen(true);
                  }}
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" /> {avatarUrl ? "Change Photo" : "Change Photo"}
                </Button>

                {avatarUrl && (
                  <Button
                    onClick={() => setRemoveModalOpen(true)}
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-xs font-bold gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t w-full">
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-extrabold px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Active Account
                </Badge>
                <Badge variant="outline" className="text-[10px] font-extrabold uppercase border-slate-200 px-3 py-1">
                  <BadgeCheck className="h-3.5 w-3.5 mr-1 text-primary" /> Customer
                </Badge>
              </div>

              {/* Account Summary Specs */}
              <div className="w-full text-left pt-3 border-t space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Account Type:</span>
                  <span className="font-bold text-foreground">Customer</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Account Status:</span>
                  <span className="font-bold text-emerald-600">Active & Verified</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Member Since:</span>
                  <span className="font-bold text-slate-700">
                    {createdAt ? new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Aug 2026"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Email Verification:</span>
                  <span className="font-bold text-blue-600">{emailVerified ? "Verified" : "Pending"}</span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — PERSONAL INFORMATION CARD */}
            <div className="lg:col-span-2 surface-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
              <div>
                <h2 className="font-black text-lg text-foreground">Personal Information</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update the information used for your JSS customer account.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5 text-xs">
                {/* Full Name Input */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Full Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="e.g. Customer JSS"
                    className={`rounded-xl text-xs font-semibold h-10 border-slate-200 ${nameError ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    required
                  />
                  {nameError && (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {nameError}
                    </p>
                  )}
                </div>

                {/* Email Address (Read-only) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-slate-700">Email Address</Label>
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3 text-slate-400" /> Protected / Read-only
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="rounded-xl text-xs font-semibold h-10 bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed pr-9"
                    />
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Contact Phone Input */}
                <div className="space-y-1.5">
                  <Label className="font-bold text-slate-700">Contact Phone Number</Label>
                  <div className="relative">
                    <Input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError(null);
                      }}
                      placeholder="e.g. 07700 900123"
                      className={`rounded-xl text-xs font-semibold h-10 border-slate-200 pl-9 ${phoneError ? "border-rose-500 focus-visible:ring-rose-500" : ""}`}
                    />
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  {phoneError ? (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> {phoneError}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      Used for delivery updates and customer support verification.
                    </p>
                  )}
                </div>

                {/* Save Changes Button */}
                <div className="pt-4 flex items-center justify-end border-t">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-full font-extrabold text-xs gap-2 px-6 shadow-md bg-primary hover:bg-primary/90 text-white"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* 3. SECURITY & PASSWORD CARD */}
          <div className="surface-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs text-xs">
            <div>
              <h2 className="font-black text-lg text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Security & Password
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage your account password and security credentials.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div>
                <p className="font-bold text-slate-800 text-xs">Account Password</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">••••••••••••••••</p>
              </div>

              <Button
                type="button"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setPasswordError(null);
                  setPasswordModalOpen(true);
                }}
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-extrabold gap-1.5 border-slate-300 hover:bg-white shrink-0"
              >
                <KeyRound className="h-3.5 w-3.5 text-primary" /> Change Password
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. UPLOAD PROFILE PHOTO DIALOG MODAL */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-foreground flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Update Profile Photo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Select an image file from your device. Supported formats: JPG, PNG, WebP (Max 5MB).
            </DialogDescription>
          </DialogHeader>

          <input
            type="file"
            ref={modalFileInputRef}
            onChange={handleModalPhotoSelect}
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
          />

          <div className="space-y-5 pt-2 text-xs">
            {/* Preview Box */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-300 text-center space-y-3">
              <Avatar className="h-24 w-24 border-4 border-white shadow-md">
                {photoPreviewUrl ? (
                  <AvatarImage src={photoPreviewUrl} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary text-white font-black text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <p className="text-[11px] font-semibold text-slate-600">
                {selectedPhotoFile ? selectedPhotoFile.name : "No new file selected yet"}
              </p>

              <Button
                type="button"
                onClick={() => modalFileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="rounded-full text-xs font-bold gap-1.5 border-slate-300"
              >
                <Upload className="h-3.5 w-3.5 text-primary" /> Choose Image
              </Button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUploadModalOpen(false)}
                disabled={uploadingPhoto}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleExecutePhotoUpload}
                disabled={uploadingPhoto || !selectedPhotoFile}
                className="rounded-full font-extrabold text-xs gap-2 px-6 shadow-md bg-primary hover:bg-primary/90 text-white"
              >
                {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploadingPhoto ? "Uploading..." : "Upload Photo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. REMOVE PHOTO CONFIRMATION DIALOG MODAL */}
      <Dialog open={removeModalOpen} onOpenChange={setRemoveModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-lg text-rose-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" /> Remove Profile Photo?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Are you sure you want to remove your profile photo? Your account will use your initials instead.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRemoveModalOpen(false)}
              disabled={removingPhoto}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleExecutePhotoRemove}
              disabled={removingPhoto}
              className="rounded-full font-extrabold text-xs gap-1.5 px-6 shadow-md bg-rose-600 hover:bg-rose-700 text-white"
            >
              {removingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {removingPhoto ? "Removing..." : "Remove Photo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. REAL SUPABASE AUTH CHANGE PASSWORD DIALOG MODAL */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Change Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Enter your current password and choose a new password for your account.
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
                  placeholder="Enter current password"
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
                  placeholder="Minimum 6 characters"
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
                  placeholder="Re-enter new password"
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
    </div>
  );
}
