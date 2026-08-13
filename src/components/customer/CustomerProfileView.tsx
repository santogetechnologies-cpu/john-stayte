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
  Send,
  Check,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const [status, setStatus] = useState("Active");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [rawPrefs, setRawPrefs] = useState<any>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation Error States
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Change Email Modal States
  const [changeEmailModalOpen, setChangeEmailModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmNewEmail, setConfirmNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState<string | null>(null);
  const [emailSentNotice, setEmailSentNotice] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

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

  // Real Supabase Storage Avatar File Upload Handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid image format. Please select a JPEG, PNG, WEBP, or GIF image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please select a smaller photo.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser?.user) throw new Error("Authentication session expired.");

      const userId = authUser.user.id;
      const fileExt = file.name.split(".").pop();
      const storagePath = `avatars/${userId}/avatar_${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(storagePath, file, {
          upsert: true,
          contentType: file.type,
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
      toast.success("Profile photo uploaded and saved successfully!");
      window.dispatchEvent(new Event("user_profile_updated"));
    } catch (err: any) {
      toast.error("Failed to upload photo: " + err.message);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Remove Photo Handler
  const handleRemovePhoto = async () => {
    setUploadingPhoto(true);
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
      toast.success("Profile photo removed.");
      window.dispatchEvent(new Event("user_profile_updated"));
    } catch (err: any) {
      toast.error("Failed to remove photo: " + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Form Validation & Save Profile
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

      toast.success("Profile details updated successfully!");
      window.dispatchEvent(new Event("user_profile_updated"));
      await loadProfile();
    } catch (err: any) {
      toast.error("Failed to update profile: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // REAL SUPABASE AUTH CHANGE EMAIL HANDLER
  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeEmailError(null);
    setEmailSentNotice(null);

    const cleanNewEmail = newEmail.trim().toLowerCase();
    const cleanConfirmEmail = confirmNewEmail.trim().toLowerCase();

    // 1. Validation
    if (!cleanNewEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanNewEmail)) {
      setChangeEmailError("Please enter a valid new email address.");
      return;
    }

    if (cleanNewEmail === email.toLowerCase()) {
      setChangeEmailError("New email address must be different from your current email.");
      return;
    }

    if (cleanNewEmail !== cleanConfirmEmail) {
      setChangeEmailError("New email address and confirmation email do not match.");
      return;
    }

    setChangingEmail(true);
    try {
      // 2. Call real Supabase Auth updateUser API
      const { data: authData, error: authUpdateErr } = await supabase.auth.updateUser({
        email: cleanNewEmail,
      });

      if (authUpdateErr) throw authUpdateErr;

      // Also update profiles.email column if configured
      const { data: authUser } = await supabase.auth.getUser();
      if (authUser?.user) {
        await supabase
          .from("profiles")
          .update({ email: cleanNewEmail, updated_at: new Date().toISOString() })
          .eq("id", authUser.user.id);
      }

      setEmailSentNotice(
        `Verification email dispatched to ${cleanNewEmail}. Please check your inbox and click the confirmation link to complete the change.`
      );
      toast.success(`Verification link sent to ${cleanNewEmail}!`);
    } catch (err: any) {
      console.error("Supabase change email error:", err);

      const errMsg = (err.message || "").toLowerCase();
      const errCode = (err.code || "").toLowerCase();
      const status = err.status || 0;

      const isRateLimitErr =
        status === 429 ||
        errCode.includes("rate_limit") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("too many requests") ||
        errMsg.includes("over_email_send_rate_limit");

      if (isRateLimitErr) {
        setIsRateLimited(true);
        const friendlyRateMsg = "Too many verification emails have been requested. Please try again later.";
        setChangeEmailError(friendlyRateMsg);
        toast.error(friendlyRateMsg);
      } else {
        setChangeEmailError(err.message || "Failed to update email address.");
        toast.error(err.message || "Failed to update email address.");
      }
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Real Supabase Storage Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
      />

      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link to="/account" className="hover:text-primary transition-colors">Account</Link>
            <span>/</span>
            <span className="text-foreground font-bold">Profile</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <User className="h-7 w-7 text-primary" /> My Profile & Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your personal profile details, account security credentials, and profile photo in Supabase.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="surface-card p-12 text-center rounded-3xl border bg-white text-xs font-bold text-muted-foreground shadow-xs flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 text-primary animate-spin" /> Querying profile credentials from Supabase...
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
            {/* LEFT COLUMN — PROFILE OVERVIEW & AVATAR CARD */}
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-primary text-white shadow-lg flex items-center justify-center border-2 border-white hover:scale-110 transition-all cursor-pointer"
                  title="Change Profile Photo"
                >
                  {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
              </div>

              <div className="space-y-1.5 w-full">
                <h2 className="font-black text-xl text-foreground truncate">{name || "Valued Customer"}</h2>
                <p className="text-xs text-muted-foreground font-medium truncate">{email}</p>
              </div>

              {/* Photo Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 w-full pt-1">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" /> {avatarUrl ? "Change Photo" : "Upload Photo"}
                </Button>

                {avatarUrl && (
                  <Button
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-xs font-bold gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t w-full">
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-extrabold px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Active Account
                </Badge>
                <Badge variant="outline" className="text-[10px] font-extrabold uppercase border-slate-200 px-3 py-1">
                  <BadgeCheck className="h-3.5 w-3.5 mr-1 text-primary" /> {role} Portal
                </Badge>
              </div>
            </div>

            {/* RIGHT COLUMN — PERSONAL INFORMATION FORM CARD */}
            <div className="lg:col-span-2 surface-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-6 shadow-xs">
              <div>
                <h2 className="font-black text-lg text-foreground">Personal Information</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your display name and contact phone number. Your changes will persist across all JSS services.
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

                {/* Email Address Input (Read-only with Change Email Trigger) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-slate-700">Email Address (Primary Account)</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setNewEmail("");
                          setConfirmNewEmail("");
                          setChangeEmailError(null);
                          setEmailSentNotice(null);
                          setChangeEmailModalOpen(true);
                        }}
                        className="h-auto p-0 text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3.5 w-3.5" /> Change Email
                      </Button>
                      <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 border-l pl-2">
                        <Lock className="h-3 w-3 text-slate-400" /> Read-only
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      type="email"
                      value={email}
                      disabled
                      className="rounded-xl text-xs font-semibold h-10 bg-slate-50/80 border-slate-200 text-slate-500 cursor-not-allowed pr-9"
                    />
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Your email address is permanently tied to your authentication account. Click "Change Email" above to update it via Supabase Auth verification.
                  </p>
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

                {/* Form Save Button */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="rounded-full font-extrabold text-xs gap-2 px-6 shadow-md bg-primary hover:bg-primary/90 text-white"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving Changes..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* 3. BOTTOM SECTION — ACCOUNT & SECURITY INFORMATION CARD */}
          <div className="surface-card p-6 sm:p-8 rounded-3xl border border-slate-200/80 bg-white space-y-4 shadow-xs text-xs">
            <div>
              <h2 className="font-black text-base text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Account & Security Specifications
              </h2>
              <p className="text-xs text-muted-foreground">
                Authentication credentials and role authorization managed by Supabase Auth & RLS policies.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Account Role</p>
                <p className="font-black text-sm text-foreground capitalize">{role}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Customer Portal Access</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Account Status</p>
                <p className="font-black text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {status} & Verified
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">Active Customer Profile</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Member Since</p>
                <p className="font-black text-sm text-foreground">
                  {createdAt ? new Date(createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Aug 2026"}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">Registration Date</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Email Verification</p>
                <p className="font-black text-sm text-blue-600 flex items-center gap-1">
                  <KeyRound className="h-4 w-4" /> Protected
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">Supabase Auth Session</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. REAL SUPABASE AUTH CHANGE EMAIL MODAL */}
      <Dialog open={changeEmailModalOpen} onOpenChange={setChangeEmailModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white">
          <DialogHeader>
            <DialogTitle className="font-black text-xl text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Change Account Email Address
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Enter your new email address. Supabase Auth will send a confirmation link to verify ownership.
            </DialogDescription>
          </DialogHeader>

          {emailSentNotice ? (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 text-emerald-900">
                <div className="flex items-center gap-2 font-black text-sm text-emerald-800">
                  <Check className="h-5 w-5 text-emerald-600" /> Verification Email Sent
                </div>
                <p className="leading-relaxed">{emailSentNotice}</p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={() => setChangeEmailModalOpen(false)}
                  className="rounded-full text-xs font-bold px-6 shadow-xs"
                >
                  Done & Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangeEmailSubmit} className="space-y-4 pt-2 text-xs">
              {/* Current Email (Read-only) */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Current Email Address</Label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="rounded-xl text-xs font-semibold h-10 bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed"
                />
              </div>

              {/* New Email Input */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">New Email Address *</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (changeEmailError) setChangeEmailError(null);
                  }}
                  placeholder="e.g. new.email@example.com"
                  className="rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>

              {/* Confirm New Email Input */}
              <div className="space-y-1.5">
                <Label className="font-bold text-slate-700">Confirm New Email Address *</Label>
                <Input
                  type="email"
                  value={confirmNewEmail}
                  onChange={(e) => {
                    setConfirmNewEmail(e.target.value);
                    if (changeEmailError) setChangeEmailError(null);
                  }}
                  placeholder="Re-enter new email address"
                  className="rounded-xl text-xs font-semibold h-10 border-slate-200"
                  required
                />
              </div>

              {isRateLimited ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-900">Verification Rate Limit Exceeded</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Too many verification emails have been requested. Please try again later.
                    </p>
                  </div>
                </div>
              ) : changeEmailError ? (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{changeEmailError}</span>
                </div>
              ) : null}

              {/* Dialog Footer Controls */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setChangeEmailModalOpen(false)}
                  disabled={changingEmail}
                  className="rounded-full text-xs font-bold"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={changingEmail || isRateLimited}
                  className="rounded-full font-extrabold text-xs gap-2 px-6 shadow-md bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isRateLimited ? "Rate Limited — Try Later" : changingEmail ? "Sending Verification..." : "Send Verification Link"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
